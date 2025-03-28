const { v4: uuidV4 } = require('uuid');
const Redis = require('ioredis');
const cluster = require('cluster');
const log = require('../../support/log');
const config = require('../../support/config');
const Metric = require('../Metric');
const Paginator = require('../paginator');
const Storage = require('../storage');


const ERR_FUNCTION_NOT_FOUND = new Error('Function not found');
const ERR_ENV_NOT_FOUND = new Error('Env variable not found');

ERR_FUNCTION_NOT_FOUND.statusCode = 404;
ERR_ENV_NOT_FOUND.statusCode = 404;

function redisKey(namespace, codeId) {
  return `code:${namespace}/${codeId}`;
}

function namespaceRedisKey(namespace) {
  return `namespace:${namespace}`;
}

function functionRedisKey(namespace, id) {
  return `${namespace}:${id}`;
}

function getFunctionRedisKey(functionKey) {
  const items = functionKey.split(':');
  return {
    namespace: items[0],
    id: items[1],
  };
}

async function getCodeAndPopulateCache(storage, namespace, id, preCache) {
  log.info('Get code from database, namespace:', namespace,
           'codeId:', id, 'and store on cache');

  const code = await storage.getCode(namespace, id);
  if (!code) {
    return null;
  }

  const cacheItem = preCache(code);
  const key = redisKey(namespace, id);
  storage.cache[key] = cacheItem;
  return cacheItem;
}


async function getMultiCodes(storage, codes, preCache) {
  const keys = codes.map(({ namespace, id }) => redisKey(namespace, id));
  const pipeline = storage.client.pipeline();

  for (const key of keys) {
    pipeline.hget(key, 'versionID');
  }

  const results = await pipeline.exec();
  return results.map(([err, versionID], i) => {
    if (err) {
      return Promise.reject(err);
    }
    const key = keys[i];
    const { namespace, id } = codes[i];
    const cacheItem = storage.cache[key];

    if (cacheItem && cacheItem.versionID === versionID) {
      return cacheItem;
    }

    // populate the cache
    return getCodeAndPopulateCache(storage, namespace, id, preCache);
  });
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
      connectTimeout: config.redisConnectionTimeout,
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

  async listNamespaces(page = 1, perPage = 10) {
    const total = await this.client.zcount('namespaces', '-inf', '+inf');
    const paginator = new Paginator(page, perPage, total);

    if (!paginator.isValid) {
      throw new Error(paginator.error);
    }

    const keys = await this.client.zrange('namespaces', paginator.start, paginator.stop);
    const items = keys.map(key => getFunctionRedisKey(key));

    const result = {
      items,
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
  }

  async search(namespace, id, page = 1, perPage = 10) {
    const total = await this.client.zcount('namespaces', '-inf', '+inf');

    const paginator = new Paginator(page, perPage, total);

    if (!paginator.isValid) {
      throw new Error(paginator.error);
    }

    const minRange = `[${functionRedisKey(namespace, id || '*')}`;
    const maxRange = `[${functionRedisKey(namespace, id || '\xff')}`;
    const keys = await this.client.zrangebylex(
      'namespaces',
      minRange,
      maxRange,
      'limit',
      paginator.start,
      paginator.perPage
    );

    const items = keys.map(key => getFunctionRedisKey(key));

    const result = {
      items,
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
  }

  setNamespaceMember(namespace, id) {
    return this.client.zadd('namespaces', 0, functionRedisKey(namespace, id));
  }

  deleteNamespaceMember(namespace, id) {
    return this.client.zrem('namespaces', 0, functionRedisKey(namespace, id));
  }

  async putCode(namespace, id, code) {
    const key = redisKey(namespace, id);
    const data = { versionID: uuidV4(), updated: new Date().toISOString() };

    const functionCode = await this.client.hget(key, 'code');
    if (functionCode == null) {
      data.created = data.updated;
    }

    if (code.code) {
      data.code = code.code;
      data.hash = code.hash;
    }

    if (code.env) {
      data.env = JSON.stringify(code.env);
    }

    this.setNamespaceMember(namespace, id);
    return this.client.hmset(key, data);
  }

  async getCode(namespace, id) {
    const key = redisKey(namespace, id);
    const data = await this.client.hgetall(key);
    if (!data.code) {
      return null;
    }

    const namespaceSettings = await this.getNamespace(namespace);
    if (namespaceSettings) {
      delete namespaceSettings.namespace;
    }

    const result = {
      id,
      namespace,
      code: data.code,
      hash: data.hash,
      created: data.created,
      updated: data.updated,
      namespaceSettings,
      versionID: data.versionID || null,
    };

    if (data.env) {
      result.env = JSON.parse(data.env);
    }

    result.sentryDSN = Storage.getSentryByEnvOrNamespace(result);

    return result;
  }

  deleteCode(namespace, id) {
    const key = redisKey(namespace, id);

    this.deleteNamespaceMember(namespace, id);

    return this.client.del(key);
  }

  async getCodeByCache(namespace, id, { preCache }) {
    const key = redisKey(namespace, id);
    const versionID = await this.client.hget(key, 'versionID');
    const cacheItem = this.cache[key];

    if (cacheItem && cacheItem.versionID === versionID) {
      return cacheItem;
    }

    return getCodeAndPopulateCache(this, namespace, id, preCache);
  }

  async getCodesByCache(codes, { preCache }) {
    return Promise.all(await getMultiCodes(this, codes, preCache));
  }

  async putCodeEnviromentVariable(namespace, id, env, value) {
    const code = await this.getCode(namespace, id);
    if (!code) {
      throw ERR_FUNCTION_NOT_FOUND;
    }
    if (!code.env) {
      code.env = {};
    }
    code.env[env] = value;
    return this.putCode(namespace, id, { env: code.env });
  }

  async deleteCodeEnviromentVariable(namespace, id, env) {
    const code = await this.getCode(namespace, id);
    if (!code) {
      throw ERR_FUNCTION_NOT_FOUND;
    }
    if (!code.env || !code.env[env]) {
      throw ERR_ENV_NOT_FOUND;
    }
    delete code.env[env];
    return this.putCode(namespace, id, { env: code.env });
  }

  async getNamespace(namespace) {
    const key = namespaceRedisKey(namespace);
    const data = await this.client.hgetall(key);
    if (!data.namespace) {
      return null;
    }
    return data;
  }

  putNamespace(namespace, data) {
    const key = namespaceRedisKey(namespace);
    return this.client.hmset(key, data);
  }

  deleteNamespace(namespace) {
    const key = namespaceRedisKey(namespace);
    return this.client.del(key);
  }

  async checkConnectionLeak() {
    const timeoutID = setTimeout(() => {
      log.error('Redis connection leak detected');
      Metric.observeRedisLeak();
      this.worker.disconnect();

      setTimeout(() => {
        this.worker.kill();
      }, this.options.heartBeatStanch * 1000);
    }, this.options.heartBeatTimeout * 1000);

    try {
      await this.ping();
      log.debug('Redis pong');
      timeoutID.close();
    } catch (err) {
      log.error('Redis error: ', err.message);
      timeoutID.close();
    }
  }
}

module.exports = StorageRedis;
