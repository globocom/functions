const RedisStorage = require('../lib/domain/storage/redis');
const deleteKeys = require('../lib/support/deleteKeys');

global.assert = require('assert');

before((done) => {
  const memoryStorage = new RedisStorage(null, () => {
    const keys = [
      'code',
      'namespaces',
    ];
    const promises = deleteKeys(keys, memoryStorage);

    return Promise.all(promises).then(() => done());
  });
});
