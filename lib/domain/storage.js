/*
 * Storage Class is a interface to create storage with the following contracts
 * lint comment is applied to prevent `class-method-use-this` for this case
 */

/* eslint class-methods-use-this: [
     'error', { "exceptMethods": ['ping', 'putCode', 'getCode', 'deleteCode', 'getCodeByCache']
   }]
*/

const ERR_UNIMPLEMENTED_METHOD = 'unimplemented method for Storage interface';

class Storage {
  constructor(name) {
    this.name = name;
  }

  ping() { throw new Error(ERR_UNIMPLEMENTED_METHOD); }

  putCode() { throw new Error(ERR_UNIMPLEMENTED_METHOD); }

  getCode() { throw new Error(ERR_UNIMPLEMENTED_METHOD); }

  deleteCode() { throw new Error(ERR_UNIMPLEMENTED_METHOD); }

  getCodeByCache() { throw new Error(ERR_UNIMPLEMENTED_METHOD); }
}

module.exports = Storage;
