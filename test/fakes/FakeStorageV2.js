/* eslint class-methods-use-this: ['error', { "exceptMethods": [
    'listNamespaces', 'getCode', 'deleteCode', 'getCodeByCache', 'compileCode', 'runScript',
    'getNamespace', 'deleteNamespace', 'search'
    ]}]*/

const Sandbox = require('@globocom/backstage-functions-sandbox');
const Storage = require('../../lib/domain/storage');

class FakeStorage extends Storage {
  constructor() {
    super();
    this.lastPutCode = null;
    this.lastEnvSet = null;
    this.lastEnvUnset = null;
  }

  async listNamespaces() {
    return {
      items: [
        { namespace: 'namespace1', id: 'function', version: '0.0.1' },
        { namespace: 'namespace2', id: 'function', version: '0.0.1' },
        { namespace: 'namespace3', id: 'function', version: '0.0.1' },
      ],
    };
  }

  async search(namespace, id) {
    if (id === 'function1' && namespace === 'namespace1') {
      return {
        items: [
          { namespace: 'namespace1', id: 'function1', version: '0.0.1' },
          { namespace: 'namespace1', id: 'function1', version: '0.0.2' },
        ],
      };
    }
    if (namespace === 'namespace1') {
      return {
        items: [
          { namespace: 'namespace1', id: 'function1', version: '0.0.1' },
          { namespace: 'namespace1', id: 'function2', version: '0.0.1' },
        ],
      };
    }
    if (namespace === 'error' || id === 'error') {
      throw new Error('Storage error');
    }
    return { items: [] };
  }

  async getCode(namespace, id) {
    if (id === 'not-found') {
      return null;
    } else if (id === 'error') {
      throw new Error('Failed to get code');
    }
    return {
      hash: 'my-hash-123',
      code: 'function main() {}',
    };
  }

  async putCode(namespace, id, version, code) {
    this.lastPutCode = code;
    if (id === 'error') {
      throw new Error('Storage error');
    }

    return null;
  }

  async deleteCode(namespace, id) {
    if (id === 'error') {
      throw new Error('Storage error');
    }
    return null;
  }

  async getCodeByCache(namespace, id, version, { preCache }) {
    if (id === 'cached') {
      const script = new Sandbox({}).compileCode('cached.js', `
        function main(req, res) {
            res.send({ result: 'cached', body: req.body })
        }`);
      return ({ script });
    } else if (id === 'fresh') {
      const code = `
        function main(req, res) {
            res.send({ result: 'fresh', body: req.body, env: Backstage.env })
        }`;
      const env = { MY_FOO: 'bar' };
      return preCache({ code, env });
    } else if (id === 'send-string') {
      const code = `
        function main(req, res) {
            res.send('this is an alert');
        }`;
      return preCache({ code });
    } else if (id === 'step1') {
      const code = `
        function main(req, res) {
            res.send({ x: req.body.x * 10 })
        }`;
      return preCache({ code });
    } else if (id === 'step2') {
      const code = `
        function main(req, res) {
            res.send({ x: req.body.x * 20 })
        }`;
      return preCache({ code });
    } else if (id === 'error') {
      throw new Error('Storage error');
    } else if (id === 'customError') {
      const err = new Error('Custom error');
      err.statusCode = 422;
      throw err;
    } else if (id === 'not-found') {
      return null;
    }
    throw new Error('Unexpected id');
  }

  getCodesByCache(codes, { preCache }) {
    const promises = codes.map(c => (
      this.getCodeByCache(c.namespace, c.id, c.version, { preCache })
    ));
    return Promise.all(promises);
  }

  async putCodeEnviromentVariable(namespace, id, version, env, value) {
    const code = await this.getCode(namespace, id, version);
    if (!code) {
      const err = new Error('Function not found');
      err.statusCode = 404;
      throw err;
    }

    this.lastEnvSet = { namespace, id, version, env, value };
    return null;
  }

  async deleteCodeEnviromentVariable(namespace, id, version, env) {
    const code = await this.getCode(namespace, id, version);
    if (!code) {
      const err = new Error('Function not found');
      err.statusCode = 404;
      throw err;
    }

    this.lastEnvUnset = { namespace, id, env };
    return null;
  }

  async putNamespace(namespace, data) {
    if (namespace === 'error') {
      throw new Error('Storage error');
    }

    this.lastPutNamespace = Object.assign({}, data, { namespace });
  }

  async getNamespace(namespace) {
    if (namespace === 'found') {
      return { namespace, sentryDSN: 'http://sentry.io/project' };
    } else if (namespace === 'error') {
      throw new Error('Storage error');
    }

    return null;
  }

  async deleteNamespace(namespace) {
    if (namespace === 'error') {
      throw new Error('Storage error');
    }
    return null;
  }
}

module.exports = FakeStorage;
