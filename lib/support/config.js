const numCPUs = require('os').cpus().length;

const ConfigDiscovery = require('./config/ConfigDiscovery');

const DEFAULT_GLOBAL_MODULES = [
  'lodash',
  'async',
  'request',
  'uuid',
  'node-fetch',
];

module.exports = {
  host: process.env.HOSTNAME || "localhost",
  port: ConfigDiscovery.getInt('PORT', 8100),
  metricsPort: ConfigDiscovery.getInt('METRICS_PORT', 8101),
  useNodeCluster: ConfigDiscovery.getBool('USE_NODE_CLUSTER', true),
  numCPUs: ConfigDiscovery.getInt('NUM_CPUS', numCPUs),
  syncTimeout: ConfigDiscovery.getInt('CODE_SYNC_TIMEOUT', 100),
  asyncTimeout: ConfigDiscovery.getInt('CODE_ASYNC_TIMEOUT', 5000),
  redis: ConfigDiscovery.parseRedisOptions(),
  defaultGlobalModules: ConfigDiscovery.getList('DEFAULT_GLOBAL_MODULES', DEFAULT_GLOBAL_MODULES),
  bodyParserLimit: process.env.BODY_PARSER_LIMIT || '1mb',
  redisConnectionTimeout: ConfigDiscovery.getInt('REDIS_CONNECTION_TIMEOUT', 2000),
  metric: {
    client: process.env.METRIC_CLIENT,
    udpHost: process.env.METRIC_UDP_HOST,
    udpPort: ConfigDiscovery.getInt('METRIC_UDP_PORT'),
  },
  log: {
    type: process.env.LOG_TYPE || 'local',
    hosts: ConfigDiscovery.getList('LOG_HOSTS', ['localhost']),
    port: ConfigDiscovery.getInt('LOG_PORT', 12201),
    fields: ConfigDiscovery.getObject('LOG_FIELDS'),
    fieldsFromHTTPHeaders: ConfigDiscovery.getObject('LOG_FIELDS_FROM_HTTP_HEADERS'),
    maxFullMessage: ConfigDiscovery.getInt('LOG_MAX_FULL_MESSAGE', 3000),
    maxChunkSize: ConfigDiscovery.getInt('LOG_MAX_CHUNK_SIZE', 32766),
    morganFormat: process.env.LOG_MONGAN_FORMAT || 'tiny',
  },
  http: {
    keepAlive: ConfigDiscovery.getBool('HTTP_KEEP_ALIVE', false),
    useCertFile: ConfigDiscovery.getBool('FUNCTIONS_USE_SSL_CERT_FILE', false),
    certFile: process.env.SSL_CERT_FILE,
  },
  trace: {
    engine: process.env.TRACE_ENGINE || 'opentracing',
    otel: {
      collector: {
        host: process.env.OTEL_COLLECTOR_HOST || 'no-op',
        port: process.env.OTEL_COLLECTOR_PORT || 55680,
      },
      service: process.env.OTEL_EXPORTER_SERVICE,
    },
  },

  storageName: process.env.STORAGE || 'redis',
  opentracingEngine: process.env.OPENTRACING_ENGINE || 'no-op',
  opentracingService: ConfigDiscovery.getPossibleString(['OPENTRACING_SERVICE', 'TSURU_APPNAME'], 'functions'),
  jaegerPropagation: process.env.JAEGER_PROPAGATION || 'jaeger',
};
