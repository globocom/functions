const { BatchSpanProcessor, BasicTracerProvider } = require('@opentelemetry/tracing')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation }  = require('@opentelemetry/instrumentation-express')
const { registerInstrumentations } = require('@opentelemetry/instrumentation')
const { CollectorTraceExporter } = require('@opentelemetry/exporter-collector-grpc')

const opentelemetry = require('@opentelemetry/api')
const OtelConfig = require('./config').otel;

const collectorOptions = {
    serviceName: OtelConfig.service,
    url: `${OtelConfig.collector.host}:${OtelConfig.collector.port}`,
    concurrencyLimit: 10
}

const provider = new BasicTracerProvider()
const exporter = new CollectorTraceExporter(collectorOptions)

provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
    maxQueueSize: 1000,
    scheduledDelayMillis: 30000
}))

registerInstrumentations({
  instrumentations: [
    new ExpressInstrumentation(),
    new HttpInstrumentation({responseHook: (span, _) => {
      const { attributes: attrs = {} }  = span
      span.updateName(`${attrs['http.method']} ${attrs['http.target']}`)
      span.setAttribute('functions.route', attrs['http.route'])
      span.setAttribute('functions.url',attrs['http.url'])
    }}),
  ]
})

provider.register();
const context = opentelemetry.context
const tracer = opentelemetry.trace.getTracer(OtelConfig.service)

function reportError(span, err) {
  //span.setTag(opentracing.Tags.ERROR, true);
  console.log('Recording Exception', err)
  span.recordException(err)
  span.end()
}

module.exports = { tracer, context, opentelemetry, reportError }