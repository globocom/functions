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
module.exports = tracer;
