/*
 * Storage Class is a interface to create storage with the following contracts
 * lint comment is applied to prevent `class-method-use-this` for this case
 */

/* eslint class-methods-use-this: [
     'error', { "exceptMethods": ['ping',
                                  'listNamespaces',
                                  'postCode', 'putCode', 'getCode', 'deleteCode',
                                  'getCodeByCache', 'getCodesByCache',
                                  'putCodeEnviromentVariable',
                                  'deleteCodeEnviromentVariable',
                                  ]
   }]
*/

const ERR_UNIMPLEMENTED_METHOD = new Error('unimplemented method for Storage interface');

class Storage {
  constructor(name) {
    this.name = name;
  }

  ping() { throw ERR_UNIMPLEMENTED_METHOD; }
  listNamespaces() { throw ERR_UNIMPLEMENTED_METHOD; }
  postCode() { throw ERR_UNIMPLEMENTED_METHOD; }
  putCode() { throw ERR_UNIMPLEMENTED_METHOD; }
  getCode() { throw ERR_UNIMPLEMENTED_METHOD; }
  deleteCode() { throw ERR_UNIMPLEMENTED_METHOD; }
  getCodeByCache() { throw ERR_UNIMPLEMENTED_METHOD; }
  getCodesByCache() { throw ERR_UNIMPLEMENTED_METHOD; }
  putCodeEnviromentVariable() { throw ERR_UNIMPLEMENTED_METHOD; }
  deleteCodeEnviromentVariable() { throw ERR_UNIMPLEMENTED_METHOD; }
}

module.exports = Storage;
