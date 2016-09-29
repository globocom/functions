const fs = require('fs');
const numCPUs = require('os').cpus().length;
const commit = fs
          .readFileSync('.git/refs/heads/master')
          .toString()
          .trim();


module.exports = {
    commit,
    port: getInt('PORT', 8100),
    numCPUs: getInt('NUM_CPUS', numCPUs),
    syncTimeout: getInt('CODE_SYNC_TIMEOUT', 100),
    asyncTimeout: getInt('CODE_ASYNC_TIMEOUT', 5000),
    redis: parseRedisOptions(),
};


function parseRedisOptions() {
    let endpoint = getPossibleString(
        ['REDIS_ENDPOINT', 'DBAAS_SENTINEL_ENDPOINT'],
        'sentinel://:@127.0.0.1:16380,127.0.0.1:16381,127.0.0.1:16382/service_name:redis-cluster'
    );
    let options = {};

    if (endpoint.startsWith('sentinel')) {
        let match = endpoint.match(/^sentinel:\/\/(.*)@(.*)\/(.*)/);
        let auth = match[1].split(':');
        let hosts = match[2].split(',');
        let path = match[3];

        options.sentinels = hosts
            .map((h) => {
                let host = h.split(':');
                return {host: host[0], port: host[1]};
            });
        options.password = auth[1];
        options.sentinelName = path.split(':')[1];
    } else {
        options.url = endpoint;
    }

    options.keyPrefix = process.env['REDIS_KEY_PREFIX'] || 'local';
    options.heartBeatSeconds = getInt('REDIS_HEARTBEAT_SECS', 60);

    return options;
}

function getInt(name, defaultValue) {
    if (process.env[name]) {
        return parseInt(process.env[name]);
    }

    return defaultValue;
}

function getPossibleString(possibleKeys, defaultValue) {
    for (let key of possibleKeys) {
        if (process.env[key]) {
            return process.env[key];
        }
    }
    return defaultValue;
}
