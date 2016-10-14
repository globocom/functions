const config = require('./config');

const deleteKeys = (keys = [], memoryStorage) => {
  const promises = [];

  for (let x = 0; x < keys.length; x += 1) {
    const promise = memoryStorage.client.keys(`test${keys[x]}*`).then((namespaces) => {
      const pipeline = memoryStorage.client.pipeline();

      for (let i = 0; i < namespaces.length; i += 1) {
        const namespace = namespaces[i].replace(`${config.redis.keyPrefix}${keys[x]}`, `${keys[x]}`);

        pipeline.del(`${namespace}`);
      }

      return pipeline.exec();
    });

    promises.push(promise);
  }

  return promises;
};

module.exports = deleteKeys;
