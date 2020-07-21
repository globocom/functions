const jaegerClient = require('jaeger-client');
const opentracing = require('opentracing');
const config = require('./config');

function setupTracer() {
  if (config.opentracingEngine !== 'jaeger') {
    // this is a no-op tracer
    return new opentracing.Tracer();
  }

  const jaegerConfig = {
    serviceName: config.opentracingService,
  };
  const options = {};
  const tracer = jaegerClient.initTracerFromEnv(jaegerConfig, options);

  if (config.jaegerPropagation === 'b3') {
    const httpCodec = new jaegerClient.ZipkinB3TextMapCodec({ urlEncoding: true });

    tracer.registerInjector(opentracing.FORMAT_HTTP_HEADERS, httpCodec);
    tracer.registerExtractor(opentracing.FORMAT_HTTP_HEADERS, httpCodec);

    const textCodec = new jaegerClient.ZipkinB3TextMapCodec({ urlEncoding: false });
    tracer.registerInjector(opentracing.FORMAT_TEXT_MAP, textCodec);
    tracer.registerExtractor(opentracing.FORMAT_TEXT_MAP, textCodec);
  }
  return tracer;
}

const tracer = setupTracer();

function reportError(span, err) {
  span.setTag(opentracing.Tags.ERROR, true);
  span.log({
    event: 'error',
    message: err.message,
    stack: err.stack,
    'error.object': err,
  });
  span.finish();
}

module.exports = { tracer, reportError };
