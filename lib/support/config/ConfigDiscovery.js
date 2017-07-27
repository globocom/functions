class ConfigDiscovery {
  static getInt(name, defaultValue) {
    if (process.env[name]) {
      return parseInt(process.env[name], 10);
    }
    return defaultValue;
  }

  static getList(envName, defaultValues) {
    if (process.env[envName]) {
      return process.env[envName].split(',').map(lib => lib.trim());
    }
    return defaultValues;
  }

  static getBool(name, defaultValue) {
    if (process.env[name]) {
      return process.env[name] === 'true';
    }
    return defaultValue;
  }

  static getPossibleString(possibleKeys, defaultValue) {
    for (const key of possibleKeys) {
      if (process.env[key]) {
        return process.env[key];
      }
    }
    return defaultValue;
  }

  static getObject(key) {
    const rawValue = process.env[key];
    return rawValue ? JSON.parse(rawValue) : {};
  }

  static parseRedisOptions() {
    const endpoint = ConfigDiscovery.getPossibleString(
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
    options.heartBeatSeconds = ConfigDiscovery.getInt('REDIS_HEARTBEAT_SECS', 5);
    options.heartBeatTimeout = ConfigDiscovery.getInt('REDIS_HEARTBEAT_TIMEOUT', 5);
    options.heartBeatStanch = ConfigDiscovery.getInt('REDIS_HEARTBEAT_STANCH', 2);

    return options;
  }

}

module.exports = ConfigDiscovery;
