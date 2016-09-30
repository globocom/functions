const Redis = require('ioredis');
const log = require('../../support/log');
const config = require('../../support/config');
const Storage = require('../storage');

class StorageRedis extends Storage {
  constructor(options = null) {
    super();
    if (!options) {
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

      this._client = new Redis(params);
    } else {
      this._client = new Redis(options.url, params);
    }

    this._client.on('ready', () => {
      log.info('Redis is ready to receive calls.');
    });
    this._client.on('error', (err) => {
      const errorMessage = `The connection with redis has been lost. Performance issues may happen. Error:${err}`;
      log.error(errorMessage);
    });
    this._cache = {};
  }

  ping() {
    return this._client.ping();
  }

  putCode(namespace, id, code) {
    const key = redisKey(namespace, id);
    const data = {
      code: code.code,
      hash: code.hash,
    };
    return this._client.hmset(key, data);
  }

  getCode(namespace, id) {
    const key = redisKey(namespace, id);
    return this._client.hgetall(key).then((data) => {
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
    return this._client.del(key);
  }

  getCodeByCache(namespace, id, { preCache }) {
    const key = redisKey(namespace, id);
    return this._client.hget(key, 'hash')
            .then((hash) => {
              const cacheItem = this._cache[key];

              if (hash && cacheItem && cacheItem.hash === hash) {
                return cacheItem;
              }

                // populate the cache
              return getCodeAndPopulateCache(this, namespace, id, preCache);
            });
  }
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
          storage._cache[key] = cacheItem;
          return cacheItem;
        });
}

function redisKey(namespace, codeId) {
  return `code:${namespace}/${codeId}`;
}

module.exports = StorageRedis;
