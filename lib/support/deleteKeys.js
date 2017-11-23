const config = require('./config');

const deleteKeys = async (keys = [], memoryStorage) => {
  for (let x = 0; x < keys.length; x += 1) {
    const namespaces = await memoryStorage.client.keys(`test${keys[x]}*`);
    const pipeline = memoryStorage.client.pipeline();

    for (let i = 0; i < namespaces.length; i += 1) {
      const namespace = namespaces[i].replace(`${config.redis.keyPrefix}${keys[x]}`, keys[x]);
      pipeline.del(namespace);
    }

    await pipeline.exec();
  }
};

module.exports = deleteKeys;
