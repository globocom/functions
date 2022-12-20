const { BatchSpanProcessor } = require('@opentelemetry/tracing');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { CollectorTraceExporter } = require('@opentelemetry/exporter-collector-grpc');
const { NodeTracerProvider } = require('@opentelemetry/node');
const { IORedisInstrumentation } = require('@opentelemetry/instrumentation-ioredis')
const config = require('./config')

const opentelemetry = require('@opentelemetry/api');
const OtelConfig = config.trace.otel;
const HOST = config.host

const collectorOptions = {
    serviceName: OtelConfig.service,
    url: `${OtelConfig.collector.host}:${OtelConfig.collector.port}`,
    concurrencyLimit: 10
}

const provider = new NodeTracerProvider();

provider.resource = provider.resource.merge({
  attributes: {
    "service.instance.id": HOST
  }
})

const exporter = new CollectorTraceExporter(collectorOptions);
provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  maxQueueSize: 1000,
  scheduledDelayMillis: 30000,
}));

registerInstrumentations({
  instrumentations: [
    new IORedisInstrumentation(),
    new HttpInstrumentation({ responseHook: (span) => {
      const { attributes: attrs = {} } = span;
      span.updateName(`${attrs['http.method']} ${attrs['http.target']}`);
      span.setAttribute('functions.route', attrs['http.route']);
      span.setAttribute('functions.url', attrs['http.url']);
    }, 
      ignoreOutgoingUrls: [/.*\/agent_listener/, /.*\/sampling/],
      ignoreIncomingPaths: [/.*\/healthcheck/, /.*\/metrics/, /.*\/sampling/]
    }),
    new ExpressInstrumentation()
  ],
});

provider.register();
const tracer = opentelemetry.trace.getTracer(OtelConfig.service);

function StartSpanMiddleware(req, res, next) {
  const span = tracer.startSpan(req.path, { attributes: {
    "http.request_id": req.headers["x-request-id"]
  }});
  req.otelSpan = span;
  next();
}

function FinalizeSpanMiddleware(req, res, next) {
  const { otelSpan } = req;
  if (otelSpan && otelSpan.end) otelSpan.end();
  next();
}

function RecordOtelError(err) {
  const span = tracer.startSpan('Exception Throwed')
  span.recordException(err.stack)
  span.setStatus({code: opentelemetry.SpanStatusCode.ERROR })
  span.end()
}

module.exports = { StartSpanMiddleware, FinalizeSpanMiddleware, RecordOtelError };
