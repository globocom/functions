/* eslint class-methods-use-this: ['error', { "exceptMethods": [
    'getCode', 'deleteCode', 'getCodeByCache', 'compileCode', 'runScript'
]}]*/

const request = require('supertest');
const chai = require('chai');
const vm = require('vm');

chai.use(require('chai-string'));

const expect = chai.expect;
const routes = require('../../../../lib/http/routes');
const Storage = require('../../../../lib/domain/storage');
const Sandbox = require('../../../../lib/domain/sandbox').Sandbox;


class FakeStorage extends Storage {
  constructor() {
    super();
    this.lastPutCode = null;
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
        const script = new vm.Script('{result: \'cached\'}');
        accept({ script });
      } else if (id === 'fresh') {
        accept(preCache({ code: '{result: \'compiled\'}' }));
      } else if (id === 'error') {
        reject(new Error('Storage error'));
      } else if (id === 'not-found') {
        accept(null);
      } else {
        reject(new Error('Unexpected id'));
      }
    });
  }
}


class FakeSandbox extends Sandbox {
  compileCode(namespace, codeId, code) {
    return new vm.Script(code.code);
  }

  runScript(namespace, codeId, script, args) {
    return new Promise((accept, reject) => {
      try {
        const output = script.runInThisContext();
        accept({ output, args });
      } catch (error) {
        reject(error);
      }
    });
  }
}

describe('GET /functions', () => {
  it('should return items', (done) => {
    request(routes)
      .get('/functions')
      .expect((res) => {
        expect(res.body.items).to.be.eql([]);
        expect(res.body.warning).to.be.eql('List is not implemented yet!');

        expect(res.profile).to.endsWith('/_schemas/functions/list');
      })
      .expect(200, done);
  });
});

describe('PUT /functions/:namespace/:id', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
  });

  describe('when code is clean', () => {
    it('should return the code', (done) => {
      const code = 'function main() {}';

      request(routes)
        .put('/functions/backstage/correct')
        .send({ code })
        .expect('Content-Type', /json/)
        .expect(() => {
          const memoryStorage = routes.get('memoryStorage');
          expect(memoryStorage.lastPutCode).to.be.eql({
            id: 'correct',
            hash: 'c177063dc3780c2fe9b4fdc913650e8147c9b8b0',
            code,
          });
        })
        .expect(200, {
          id: 'correct',
          code: 'function main() {}',
          hash: 'c177063dc3780c2fe9b4fdc913650e8147c9b8b0',
        }, done);
    });
  });

  describe('when return any error from storage', () => {
    it('should return the code', (done) => {
      const code = 'function main() {}';

      request(routes)
        .put('/functions/backstage/error')
        .send({ code })
        .expect('Content-Type', /json/)
        .expect(500, {
          error: 'Storage error',
        }, done);
    });
  });

  describe('when code has a syntax error', () => {
    it('should return a error', (done) => {
      request(routes)
        .put('/functions/backstage/invalid')
        .send({ code: '{)' })
        .expect('Content-Type', /application\/json/)
        .expect(400, {
          error: 'SyntaxError: Unexpected token )',
          stack: '',
        }, done);
    });
  });

  describe('when code has a logic error', () => {
    it('should return a error', (done) => {
      const code = `let a = {};
            function c() {
                a.b();
            };
            c()`;

      request(routes)
        .put('/functions/codes/crazy')
        .send({ code })
        .expect('Content-Type', /json/)
        .expect(400, {
          error: 'TypeError: a.b is not a function',
          stack: 'at c (codes/crazy.js:3)\nat codes/crazy.js:5\nat codes/crazy.js:6',
        }, done);
    });
  });

  describe('when code has a timeout error', () => {
    it('should return a error', (done) => {
      const code = 'while(1) {};';

      request(routes)
        .put('/functions/codes/timeout')
        .send({ code })
        .expect('Content-Type', /json/)
        .expect(400, {
          error: 'Error: Script execution timed out.',
          stack: '',
        }, done);
    });
  });

  describe('when code is not a string', () => {
    it('should return a error', (done) => {
      const code = { wrong: 'yes' };

      request(routes)
        .put('/functions/codes/invalid')
        .send({ code })
        .expect('Content-Type', /^application\/json/)
        .expect(400, {
          error: 'Invalid instance',
          details: [
            'instance.code is not of a type(s) string',
          ],
        }, done);
    });
  });
});


describe('GET /functions/:namespace/:id', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
    routes.set('sandbox', new FakeSandbox());
  });

  describe('when code is not found', () => {
    it('should return 404 error', (done) => {
      request(routes)
        .get('/functions/backstage/not-found')
        .expect((res) => {
          expect(res.body.error).to.be.eql('Code not found');
        })
        .expect(404, done);
    });
  });

  describe('when code is found', () => {
    it('should return the code', (done) => {
      request(routes)
        .get('/functions/backstage/found')
        .expect('ETag', 'my-hash-123')
        .expect((res) => {
          expect(res.body.hash).to.be.eql('my-hash-123');
        })
        .expect(200, done);
    });
  });
});


describe('DELETE /functions/:namespace/:id', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
  });

  describe('when delete is not sucessfully', () => {
    it('should return 500 error', (done) => {
      request(routes)
        .delete('/functions/backstage/error')
        .expect((res) => {
          expect(res.body.error).to.be.eql('Storage error');
        })
        .expect(500, done);
    });
  });

  describe('when delete is successfully', () => {
    it('should return 204', (done) => {
      request(routes)
        .delete('/functions/backstage/found')
        .expect(204, done);
    });
  });
});


describe('PUT /functions/:namespace/:id', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
    routes.set('sandbox', new FakeSandbox());
  });

  describe('when code is found in cache', () => {
    it('should reuse compiled code from storage cache', (done) => {
      request(routes)
        .put('/functions/backstage/cached/run')
        .send({ args: [1, 2] })
        .expect(200, {
          result: {
            args: [1, 2],
            output: 'cached',
          },
        }, done);
    });
  });

  describe('when code is not found in cache', () => {
    it('should compile code from storage', (done) => {
      request(routes)
        .put('/functions/backstage/fresh/run')
        .send({ args: [3, 4] })
        .expect(200, {
          result: {
            args: [3, 4],
            output: 'compiled',
          },
        }, done);
    });
  });
  describe('when code is not found in storage', () => {
    it('should return a 404 error', (done) => {
      request(routes)
        .put('/functions/backstage/not-found/run')
        .send({ args: [] })
        .expect(404, {
          error: 'Code \'backstage/not-found\' is not found',
        }, done);
    });
  });

  describe('when error is found', () => {
    it('should return a 500 error', (done) => {
      request(routes)
        .put('/functions/backstage/error/run')
        .send({ args: [] })
        .expect(500, {
          error: 'Storage error',
        }, done);
    });
  });
});
