const StorageRedis = require('../domain/storage/redis');
const StorageInMemory = require('../domain/storage/InMemory');
const config = require('../support/config');

const DEFAULT_STORAGES = {
  redis: StorageRedis,
  inmemory: StorageInMemory,
};

const getStorage = DEFAULT_STORAGES[config.storageName];

module.exports = getStorage;
