const { BatchSpanProcessor } = require('@opentelemetry/tracing');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { CollectorTraceExporter } = require('@opentelemetry/exporter-collector-grpc');
const { NodeTracerProvider } = require('@opentelemetry/node');

const opentelemetry = require('@opentelemetry/api');
const OtelConfig = require('./config').trace.otel;

const collectorOptions = {
    serviceName: OtelConfig.service,
    url: `${OtelConfig.collector.host}:${OtelConfig.collector.port}`,
    concurrencyLimit: 10
}

const provider = new NodeTracerProvider();
const exporter = new CollectorTraceExporter(collectorOptions);

provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  maxQueueSize: 1000,
  scheduledDelayMillis: 30000,
}));

registerInstrumentations({
  instrumentations: [
    new ExpressInstrumentation(),
    new HttpInstrumentation({ responseHook: (span) => {
      const { attributes: attrs = {} } = span;
      span.updateName(`${attrs['http.method']} ${attrs['http.target']}`);
      span.setAttribute('functions.route', attrs['http.route']);
      span.setAttribute('functions.url', attrs['http.url']);
    } }),
  ],
});

provider.register();
const tracer = opentelemetry.trace.getTracer(OtelConfig.service);

function sendOtelError(req, error) {
  if (req.otelSpan && req.otelSpan.recordException) {
    req.otelSpan.recordException(error);
  }
}


function StartSpanMiddleware(req, res, next) {
  const span = tracer.startSpan(req.path);
  req.otelSpan = span;
  next();
}

function FinalizeSpanMiddleware(req, res, next) {
  const { otelSpan } = req;
  if (otelSpan && otelSpan.end) otelSpan.end();
  next();
}

module.exports = { sendOtelError, StartSpanMiddleware, FinalizeSpanMiddleware };
