const numCPUs = require('os').cpus().length;

const ConfigDiscovery = require('./config/ConfigDiscovery');

const DEFAULT_GLOBAL_MODULES = [
  'lodash',
  'async',
  'request',
  'node-uuid',
];

module.exports = {
  port: ConfigDiscovery.getInt('PORT', 8100),
  numCPUs: ConfigDiscovery.getInt('NUM_CPUS', numCPUs),
  syncTimeout: ConfigDiscovery.getInt('CODE_SYNC_TIMEOUT', 100),
  asyncTimeout: ConfigDiscovery.getInt('CODE_ASYNC_TIMEOUT', 5000),
  redis: ConfigDiscovery.parseRedisOptions(),
  defaultGlobalModules: ConfigDiscovery.getList('DEFAULT_GLOBAL_MODULES', DEFAULT_GLOBAL_MODULES),
  metric: {
    client: process.env.METRIC_CLIENT,
    udpHost: process.env.METRIC_UDP_HOST,
    udpPort: ConfigDiscovery.getInt('METRIC_UDP_PORT'),
  },
};
