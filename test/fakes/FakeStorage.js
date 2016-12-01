/* eslint class-methods-use-this: ['error', { "exceptMethods": [
    'listNamespaces', 'getCode', 'deleteCode', 'getCodeByCache', 'compileCode', 'runScript'
    ]}]*/

const Sandbox = require('backstage-functions-sandbox');
const Storage = require('../../lib/domain/storage');

class FakeStorage extends Storage {
  constructor() {
    super();
    this.lastPutCode = null;
  }

  listNamespaces() {
    return new Promise((accept) => {
      accept({
        items: [
          { namespace: 'namespace1', id: 'function' },
          { namespace: 'namespace2', id: 'function' },
          { namespace: 'namespace3', id: 'function' },
        ],
      });
    });
  }

  getCode(namespace, id) {
    return new Promise((accept, reject) => {
      if (id === 'not-found') {
        accept(null);
      } else if (id === 'error') {
        reject(new Error('Failed to get code'));
      } else {
        accept({
          hash: 'my-hash-123',
          code: 'function main() {}',
        });
      }
    });
  }

  postCode(namespace, id, code) {
    this.lastPutCode = code;
    return new Promise((accept, reject) => {
      if (id === 'exists') {
        reject(new Error('Code already exists'));
      } else if (id === 'error') {
        reject(new Error('Storage error'));
      } else {
        accept([1, 1]);
      }
    });
  }

  putCode(namespace, id, code) {
    this.lastPutCode = code;
    return new Promise((accept, reject) => {
      if (id === 'error') {
        reject(new Error('Storage error'));
      } else {
        accept(null);
      }
    });
  }

  deleteCode(namespace, id) {
    return new Promise((accept, reject) => {
      if (id === 'error') {
        reject(new Error('Storage error'));
      } else {
        accept(null);
      }
    });
  }

  getCodeByCache(namespace, id, { preCache }) {
    return new Promise((accept, reject) => {
      if (id === 'cached') {
        const script = new Sandbox({}).compileCode('cached.js', `
        function main(req, res) {
            res.send({ result: 'cached', body: req.body })
        }`);
        accept({ script });
      } else if (id === 'fresh') {
        const code = `
        function main(req, res) {
            res.send({ result: 'fresh', body: req.body })
        }`;
        accept(preCache({ code }));
      } else if (id === 'step1') {
        const code = `
        function main(req, res) {
            res.send({ x: req.body.x * 10 })
        }`;
        accept(preCache({ code }));
      } else if (id === 'step2') {
        const code = `
        function main(req, res) {
            res.send({ x: req.body.x * 20 })
        }`;
        accept(preCache({ code }));
      } else if (id === 'error') {
        reject(new Error('Storage error'));
      } else if (id === 'customError') {
        const err = new Error('Custom error');
        err.statusCode = 422;
        reject(err);
      } else if (id === 'not-found') {
        accept(null);
      } else {
        reject(new Error('Unexpected id'));
      }
    });
  }

  getCodesByCache(codes, { preCache }) {
    const promises = codes.map(c => this.getCodeByCache(c.namespace, c.id, { preCache }));
    return Promise.all(promises);
  }
}

module.exports = FakeStorage;
