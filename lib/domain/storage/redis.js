const Redis = require('ioredis');
const log = require('../../support/log');
const config = require('../../support/config');
const Storage = require('../storage');


function redisKey(namespace, codeId) {
  return `code:${namespace}/${codeId}`;
}

function getCodeAndPopulateCache(storage, namespace, id, preCache) {
  log.info('Get code from database, namespace:', namespace,
           'codeId:', id, 'and store on cache');

  return storage
    .getCode(namespace, id)
    .then((code) => {
      if (!code) {
        return null;
      }

      const cacheItem = preCache(code);
      const key = redisKey(namespace, id);
      storage.cache[key] = cacheItem;
      return cacheItem;
    });
}

class StorageRedis extends Storage {
  constructor(customOptions = null) {
    super('Redis');
    let options;

    if (customOptions) {
      options = customOptions;
    } else {
      options = config.redis;
    }

    const params = {
      enableReadyCheck: true,
      dropBufferSupport: true,
      enableOfflineQueue: options.enableOfflineQueue,
      connectTimeout: 1000,
      keyPrefix: options.keyPrefix,
    };

    if (options.sentinels) {
      params.sentinels = options.sentinels;
      params.name = options.sentinelName;
      params.password = options.password;

      this.client = new Redis(params);
    } else {
      this.client = new Redis(options.url, params);
    }

    this.client.on('ready', () => {
      log.info('Redis is ready to receive calls.');
    });
    this.client.on('error', (err) => {
      const errorMessage = `The connection with Redis has been lost. Performance issues may happen. Error: ${err}`;
      log.error(errorMessage);
    });
    this.cache = {};
  }

  ping() {
    return this.client.ping();
  }

  postCode(namespace, id, code) {
    const key = redisKey(namespace, id);
    const data = {
      code: code.code,
      hash: code.hash,
    };
    return this.client.hsetnx(key, data);
  }

  putCode(namespace, id, code) {
    const key = redisKey(namespace, id);
    const data = {
      code: code.code,
      hash: code.hash,
    };
    return this.client.hmset(key, data);
  }

  getCode(namespace, id) {
    const key = redisKey(namespace, id);
    return this.client.hgetall(key).then((data) => {
      if (!data.code) {
        return null;
      }
      return {
        id,
        code: data.code,
        hash: data.hash,
      };
    });
  }

  deleteCode(namespace, id) {
    const key = redisKey(namespace, id);
    return this.client.del(key);
  }

  getCodeByCache(namespace, id, { preCache }) {
    const key = redisKey(namespace, id);
    return this.client.hget(key, 'hash')
      .then((hash) => {
        const cacheItem = this.cache[key];

        if (hash && cacheItem && cacheItem.hash === hash) {
          return cacheItem;
        }

        // populate the cache
        return getCodeAndPopulateCache(this, namespace, id, preCache);
      });
  }
}

module.exports = StorageRedis;
