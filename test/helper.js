const RedisStorage = require('../lib/domain/storage/redis');
const deleteKeys = require('../lib/support/deleteKeys');

global.assert = require('assert');

before((done) => {
  const memoryStorage = new RedisStorage(null, async () => {
    const keys = [
      'code',
      'namespaces',
    ];
    try {
      await deleteKeys(keys, memoryStorage);
      done();
    } catch (err) {
      done(err);
    }
  });
});
