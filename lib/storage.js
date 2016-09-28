const Redis = require('ioredis');
const log = require('./log');
const config = require('./config');


class Storage {
    constructor(options=null) {
        if (!options) {
            options = config.redisSentinel;
        }

        this._client = new Redis({
            sentinels: parseRedisString(options.sentinelEndpoint),
            name: options.sentinelName,
            password: options.password,
            enableReadyCheck: true,
            dropBufferSupport: true,
            enableOfflineQueue: options.enableOfflineQueue,
            connectTimeout: 1000,
            keyPrefix: options.keyPrefix
        });

        this._client.on('ready', function () {
            log.info('Redis is ready to receive calls.');
        });
        this._client.on('error', function (err) {
            let errorMessage = 'The connection with redis has been lost. Performance issues may happen. Error:' + err;
            log.error(errorMessage);
        });
        this._cache = {};
    }

    ping() {
        return this._client.ping();
    }

    putCode(namespace, id, code) {
        let key = _redisKey(namespace, id);
        let data = {
            code: code.code,
            hash: code.hash,
            defines: JSON.stringify(code.defines),
        };
        return this._client.hmset(key, data);
    }

    getCode(namespace, id) {
        let key = _redisKey(namespace, id);
        return this._client.hgetall(key).then((data) => {
            if (!data.code) {
                return null;
            }
            return {
                id,
                code: data.code,
                hash: data.hash,
                defines: JSON.parse(data.defines),
            };
        });
    }

    deleteCode(namespace, id) {
        let key = _redisKey(namespace, id);
        return this._client.del(key);
    }

    getCodeByCache(namespace, id, {preCache}) {
        let key = _redisKey(namespace, id);
        return this._client.hget(key, 'hash')
            .then((hash) => {
                let cacheItem = this._cache[key];

                if (hash && cacheItem && cacheItem.hash === hash) {
                    return cacheItem;
                }

                //populate the cache
                return getCodeAndPopulateCache(this, namespace, id, preCache);
            });
    }
}

function getCodeAndPopulateCache(storage, namespace, id, preCache) {
    log.info('Get code from database, namespace: ', namespace,
             'codeId:', id, 'and store on cache');

    return storage
        .getCode(namespace, id)
        .then((code) => {
            if (!code) {
                return null;
            }

            let cacheItem = preCache(code);
            let key = _redisKey(namespace, id);
            storage._cache[key] = cacheItem;
            return cacheItem;
        });
}

function parseRedisString(sentinelString) {
    var hosts = sentinelString.match(/@(.*)\//)[1].split(',');

    return hosts
        .map((h) => {
            let host = h.split(':');
            return {host: host[0], port: host[1]};
        });
}

function _redisKey(namespace, codeId) {
    return `code:${namespace}/${codeId}`;
}

module.exports = Storage;
