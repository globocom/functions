/* eslint class-methods-use-this: ['error', { 'exceptMethods': ['ping']}] */

const Storage = require('../../lib/domain/storage');

class WorkingStorage extends Storage {
  constructor(name = 'TestStorage') {
    super(name);
  }

  ping() {
    return new Promise((accept) => {
      accept('OK');
    });
  }
}

module.exports = WorkingStorage;
