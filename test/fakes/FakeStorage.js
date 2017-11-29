/* eslint class-methods-use-this: ['error', { "exceptMethods": [
    'listNamespaces', 'getCode', 'deleteCode', 'getCodeByCache', 'compileCode', 'runScript'
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
        { namespace: 'namespace1', id: 'function' },
        { namespace: 'namespace2', id: 'function' },
        { namespace: 'namespace3', id: 'function' },
      ],
    };
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

  async postCode(namespace, id, code) {
    this.lastPutCode = code;

    if (id === 'exists') {
      throw new Error('Code already exists');
    } else if (id === 'error') {
      throw new Error('Storage error');
    }

    return [1, 1];
  }

  async putCode(namespace, id, code) {
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

  async getCodeByCache(namespace, id, { preCache }) {
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
    const promises = codes.map(c => this.getCodeByCache(c.namespace, c.id, { preCache }));
    return Promise.all(promises);
  }

  async putCodeEnviromentVariable(namespace, id, env, value) {
    const code = await this.getCode(namespace, id);
    if (!code) {
      const err = new Error('Function not found');
      err.statusCode = 404;
      throw err;
    }

    this.lastEnvSet = { namespace, id, env, value };
    return null;
  }

  async deleteCodeEnviromentVariable(namespace, id, env) {
    const code = await this.getCode(namespace, id);
    if (!code) {
      const err = new Error('Function not found');
      err.statusCode = 404;
      throw err;
    }

    this.lastEnvUnset = { namespace, id, env };
    return null;
  }
}

module.exports = FakeStorage;
