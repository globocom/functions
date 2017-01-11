/* eslint class-methods-use-this: ['error', { "exceptMethods": [
    'listNamespaces', 'getCode', 'deleteCode', 'getCodeByCache', 'compileCode', 'runScript'
    ]}]*/

const Sandbox = require('backstage-functions-sandbox');
const Storage = require('../../lib/domain/storage');

class FakeStorage extends Storage {
  constructor() {
    super();
    this.lastPutCode = null;
    this.lastEnvSet = null;
    this.lastEnvUnset = null;
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
            res.send({ result: 'fresh', body: req.body, env: Backstage.env })
        }`;
        const env = { MY_FOO: 'bar' };
        accept(preCache({ code, env }));
      } else if (id === 'send-string') {
        const code = `
        function main(req, res) {
            res.send('this is an alert');
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

  putCodeEnviromentVariable(namespace, id, env, value) {
    return this.getCode(namespace, id)
      .then((code) => {
        if (!code) {
          const err = new Error('Function not found');
          err.statusCode = 404;
          throw err;
        }

        this.lastEnvSet = { namespace, id, env, value };
        return null;
      });
  }

  deleteCodeEnviromentVariable(namespace, id, env) {
    return this.getCode(namespace, id)
      .then((code) => {
        if (!code) {
          const err = new Error('Function not found');
          err.statusCode = 404;
          throw err;
        }

        this.lastEnvUnset = { namespace, id, env };
        return null;
      });
  }
}

module.exports = FakeStorage;
