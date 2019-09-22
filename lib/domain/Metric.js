const prometheusClient = require('prom-client');

prometheusClient.collectDefaultMetrics();

const buckets = [
  0.001,
  0.002,
  0.005,
  0.010,
  0.020,
  0.050,
  0.100,
  0.200,
  0.500,
  1,
  2,
  5,
  10,
  15,
  20,
];

const functionRunHistogram = new prometheusClient.Histogram({
  name: 'backstage_functions_function_run_duration_seconds',
  help: 'How many time spent to run a function in seconds',
  buckets,
  labelNames: ['namespace', 'id'],
});

const functionOverviewRunHistogram = new prometheusClient.Histogram({
  name: 'backstage_functions_overview_run_duration_seconds',
  help: 'How many time spent to run all functions in seconds',
  buckets,
});

const functionPipelineHistogram = new prometheusClient.Histogram({
  name: 'backstage_functions_pipeline_run_duration_seconds',
  help: 'How many time spent to run a function pipeline in seconds',
  buckets,
});

function normalizeStatusCode(status) {
  if (status < 200) {
    return '1xx';
  } else if (status < 300) {
    return '2xx';
  } else if (status < 400) {
    return '3xx';
  } else if (status < 500) {
    return '4xx';
  }
  return '5xx';
}

const functionOverviewRunCounter = new prometheusClient.Counter({
  name: 'backstage_functions_overview_run_total',
  help: 'What the portion of executions by status codes',
  labelNames: ['status'],
});

const functionRunCounter = new prometheusClient.Counter({
  name: 'backstage_functions_function_run_total',
  help: 'What is the status code of a function',
  labelNames: ['namespace', 'id', 'status'],
});

const functionPipelineCounter = new prometheusClient.Counter({
  name: 'backstage_functions_pipeline_run_total',
  help: 'What is the status code of pipelines',
  labelNames: ['status'],
});

const redisLeaksCounter = new prometheusClient.Counter({
  name: 'backstage_functions_redis_leaks_total',
  help: 'How many redis leaks in backstage functions',
});

class Metric {
  constructor(metric) {
    this.metric = metric;
    this.start = Date.now();
  }

  observeFunctionRun({ namespace, id, status }) {
    const spent = (Date.now() - this.start) / 1000;
    const normalizedStatusCode = normalizeStatusCode(status);

    functionOverviewRunHistogram.observe(spent);
    functionOverviewRunCounter.labels(normalizedStatusCode).inc();

    functionRunHistogram.labels(namespace, id).observe(spent);
    functionRunCounter.labels(namespace, id, normalizedStatusCode).inc();

    return spent;
  }

  observePipelineRun(status) {
    const spent = (Date.now() - this.start) / 1000;
    const normalizedStatusCode = normalizeStatusCode(status);

    functionPipelineHistogram.observe(spent);
    functionPipelineCounter.labels(normalizedStatusCode).inc();
  }

  static observeRedisLeak() {
    redisLeaksCounter.inc();
  }
}

module.exports = Metric;
