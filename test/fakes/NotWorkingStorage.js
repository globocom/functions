/* eslint class-methods-use-this: ['error', { 'exceptMethods': ['ping']}] */

const Storage = require('../../lib/domain/storage');

class NotWorkingStorage extends Storage {
  constructor(name = 'TestStorage') {
    super(name);
  }

  async ping() {
    throw new Error('Not working');
  }
}

module.exports = NotWorkingStorage;
