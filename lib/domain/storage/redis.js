const Redis = require('ioredis');
const cluster = require('cluster');
const log = require('../../support/log');
const config = require('../../support/config');
const Metric = require('../Metric');
const Paginator = require('../paginator');
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


function getMultiCodes(storage, codes, preCache) {
  const keys = codes.map(({ namespace, id }) => redisKey(namespace, id));
  const pipeline = storage.client.pipeline();

  for (const key of keys) {
    pipeline.hget(key, 'hash');
  }
  return pipeline
    .exec()
    .then(results => results.map(([err, hash], i) => {
      if (err) {
        return Promise.reject(err);
      }
      const key = keys[i];
      const { namespace, id } = codes[i];
      const cacheItem = storage.cache[key];

      if (hash && cacheItem && cacheItem.hash === hash) {
        return cacheItem;
      }

      // populate the cache
      return getCodeAndPopulateCache(storage, namespace, id, preCache);
    }));
}


class StorageRedis extends Storage {
  constructor(customOptions = null, callback = null) {
    super('Redis');

    if (customOptions) {
      this.options = customOptions;
    } else {
      this.options = config.redis;
    }

    const params = {
      enableReadyCheck: true,
      dropBufferSupport: true,
      enableOfflineQueue: this.options.enableOfflineQueue,
      connectTimeout: 1000,
      keyPrefix: this.options.keyPrefix,
    };

    if (this.options.sentinels) {
      params.sentinels = this.options.sentinels;
      params.name = this.options.sentinelName;
      params.password = this.options.password;

      this.client = new Redis(params);
    } else {
      this.client = new Redis(this.options.url, params);
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
    this.worker = cluster.worker;

    if (this.worker) {
      setInterval(() => {
        this.checkConnectionLeak();
      }, this.options.heartBeatSeconds * 1000);
    }
  }

  ping() {
    return this.client.ping();
  }

  listNamespaces(page = 1, perPage = 10) {
    return this.client.zcount('namespaces', '-inf', '+inf').then((total) => {
      const paginator = new Paginator(page, perPage, total);

      if (!paginator.isValid) {
        throw new Error(paginator.error);
      }

      return this.client.zrange('namespaces', paginator.start, paginator.stop).then((items) => {
        const list = [];

        for (let item of items) {
          item = item.split(':');

          list.push({
            namespace: item[0],
            id: item[1],
          });
        }

        const result = {
          items: list,
          page: paginator.page,
          perPage: paginator.perPage,
        };

        if (paginator.previousPage) {
          result.previousPage = paginator.previousPage;
        }

        if (paginator.nextPage) {
          result.nextPage = paginator.nextPage;
        }

        return result;
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
        namespace,
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

  getCodesByCache(codes, { preCache }) {
    return getMultiCodes(this, codes, preCache).then(x => Promise.all(x));
  }

  checkConnectionLeak() {
    const timeoutID = setTimeout(() => {
      log.error('Redis connection leak detected');
      new Metric('redis-connection-leak').finish();
      this.worker.disconnect();

      setTimeout(() => {
        this.worker.kill();
      }, this.options.heartBeatStanch * 1000);
    }, this.options.heartBeatTimeout * 1000);

    this.ping().then(() => {
      log.debug('Redis pong');
      timeoutID.close();
    }, (err) => {
      log.error('Redis error: ', err.message);
      timeoutID.close();
    });
  }
}

module.exports = StorageRedis;
