const fs = require('fs');
const commit = fs
          .readFileSync('.git/refs/heads/master')
          .toString()
          .trim();

module.exports = {
    commit,
    syncTimeout: getInt('CODE_SYNC_TIMEOUT', 100),
    asyncTimeout: getInt('CODE_ASYNC_TIMEOUT', 5000),
    redisSentinel: {
        // jshint camelcase: false
        sentinelEndpoint: process.env['DBAAS_SENTINEL_ENDPOINT'] || 'sentinel://:@127.0.0.1:16380,127.0.0.1:16381,127.0.0.1:16382/service_name:redis-cluster',
        sentinelName: process.env['DBAAS_SENTINEL_SERVICE_NAME'] || 'redis-cluster',
        password: process.env['DBAAS_SENTINEL_PASSWORD'] || '',
        keyPrefix: process.env['REDIS_KEY_PREFIX'] || 'local',
        heartBeatSeconds: process.env['REDIS_HEARTBEAT_SECS'] || 60
    }
};

function getInt(name, defaultValue) {
    if (process.env[name]) {
        return parseInt(process.env[name]);
    }

    return defaultValue;
}
