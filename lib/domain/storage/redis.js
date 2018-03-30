const Redis = require('ioredis');
const uuidV4 = require('uuid/v4');
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

  async listNamespaces(page = 1, perPage = 10) {
    const total = await this.client.zcount('namespaces', '-inf', '+inf');
    const paginator = new Paginator(page, perPage, total);

    if (!paginator.isValid) {
      throw new Error(paginator.error);
    }

    const items = await this.client.zrange('namespaces', paginator.start, paginator.stop);
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
    const created = new Date().toISOString();

    pipeline.hsetnx(key, 'code', code.code);
    pipeline.hsetnx(key, 'hash', code.hash);
    pipeline.hsetnx(key, 'versionID', uuidV4());
    pipeline.hsetnx(key, 'created', created);
    pipeline.hsetnx(key, 'updated', created);

    if (code.env) {
      pipeline.hsetnx(key, 'env', code.env);
    }

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

    if (code.exposed === true) {
      data.exposed = 'true';
    } else if (code.exposed === false) {
      data.exposed = 'false';
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
      exposed: data.exposed === 'true',
    };

    if (data.env) {
      result.env = JSON.parse(data.env);
    }

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
      new Metric('redis-connection-leak').finish();
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
