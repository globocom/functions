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
  constructor(customOptions = null, callback = null) {
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

      if (callback) {
        callback();
      }
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

  listNamespaces(page = 1, perPage = 10) {
    return this.client.zcount('namespaces', '-inf', '+inf').then((total) => {
      if (page < 1 || perPage < 1) {
        throw new Error('Page and / or Per Page cannot be lower than 1');
      }

      const totalPages = Math.ceil(total / perPage);
      const previousPage = page === 1 ? null : page - 1;
      const nextPage = page >= totalPages ? null : page + 1;
      console.log(page, totalPages);
      if (page > totalPages && totalPages > 0) {
        throw new Error(`Page cannot be higher than ${totalPages}`);
      }

      const start = (page * perPage) - perPage;
      const stop = (page * perPage) - 1;

      return this.client.zrange('namespaces', start, stop).then((items) => {
        const list = [];

        for (let item of items) {
          item = item.split(':');

          list.push({
            namespace: item[0],
            id: item[1],
          });
        }

        return {
          items: list,
          previousPage,
          nextPage,
          page,
          perPage,
        };
      });
    });
  }

  setNamespaceMember(namespace, id) {
    return this.client.zadd('namespaces', 0, `${namespace}:${id}`);
  }

  deleteNamespaceMember(namespace, id) {
    return this.client.zrem('namespaces', 0, `${namespace}:${id}`);
  }

  postCode(namespace, id, code) {
    const key = redisKey(namespace, id);
    const pipeline = this.client.pipeline();

    pipeline.hsetnx(key, 'code', code.code);
    pipeline.hsetnx(key, 'hash', code.hash);

    return pipeline.exec((err, results) => {
      const codeResult = results[0][1];
      const hashResult = results[1][1];

      // Only save namespace and its member
      // when code and hash don't exist
      if (codeResult === 1 && hashResult === 1) {
        this.setNamespaceMember(namespace, id);
      }
    });
  }

  putCode(namespace, id, code) {
    const key = redisKey(namespace, id);
    const data = {
      code: code.code,
      hash: code.hash,
    };

    this.setNamespaceMember(namespace, id);

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

    this.deleteNamespaceMember(namespace, id);

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
