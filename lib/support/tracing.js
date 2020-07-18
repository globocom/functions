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
  return jaegerClient.initTracerFromEnv(jaegerConfig, options);
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
