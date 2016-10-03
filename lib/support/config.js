const fs = require('fs');
const numCPUs = require('os').cpus().length;

function getInt(name, defaultValue) {
  if (process.env[name]) {
    return parseInt(process.env[name], 10);
  }

  return defaultValue;
}

function getPossibleString(possibleKeys, defaultValue) {
  for (const key of possibleKeys) {
    if (process.env[key]) {
      return process.env[key];
    }
  }
  return defaultValue;
}

function parseRedisOptions() {
  const endpoint = getPossibleString(
    ['REDIS_ENDPOINT', 'DBAAS_SENTINEL_ENDPOINT'],
    'sentinel://:@127.0.0.1:16380,127.0.0.1:16381,127.0.0.1:16382/service_name:redis-cluster'
  );
  const options = {};

  if (endpoint.startsWith('sentinel')) {
    const match = endpoint.match(/^sentinel:\/\/(.*)@(.*)\/(.*)/);
    const auth = match[1].split(':');
    const hosts = match[2].split(',');
    const path = match[3];

    options.sentinels = hosts
      .map((h) => {
        const host = h.split(':');
        return { host: host[0], port: host[1] };
      });
    options.password = auth[1];
    options.sentinelName = path.split(':')[1];
  } else {
    options.url = endpoint;
  }

  options.enableOfflineQueue = false;
  options.keyPrefix = process.env.REDIS_KEY_PREFIX || 'local';
  options.heartBeatSeconds = getInt('REDIS_HEARTBEAT_SECS', 60);

  return options;
}

const DEFAULT_GLOBAL_MODULES = [
  'lodash',
  'async',
  'request',
  'node-uuid',
];

module.exports = {
  port: getInt('PORT', 8100),
  numCPUs: getInt('NUM_CPUS', numCPUs),
  syncTimeout: getInt('CODE_SYNC_TIMEOUT', 100),
  asyncTimeout: getInt('CODE_ASYNC_TIMEOUT', 5000),
  redis: parseRedisOptions(),
  defaultGlobalModules: DEFAULT_GLOBAL_MODULES,
};
