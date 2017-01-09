const request = require('supertest');
const chai = require('chai');
chai.use(require('chai-string'));

const Sandbox = require('backstage-functions-sandbox');

const expect = chai.expect;
const routes = require('../../../../lib/http/routes');
const FakeStorage = require('../../../fakes/FakeStorage');


describe('GET /functions', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
  });

  it('should return namespaces with their functions', (done) => {
    request(routes)
      .get('/functions')
      .expect((res) => {
        expect(res.body.items[0].namespace).to.be.eql('namespace1');
        expect(res.body.items[0].id).to.be.eql('function');
        expect(res.body.items[1].namespace).to.be.eql('namespace2');
        expect(res.body.items[1].id).to.be.eql('function');
        expect(res.body.items[2].namespace).to.be.eql('namespace3');
        expect(res.body.items[2].id).to.be.eql('function');
        expect(res.profile).to.endsWith('/_schemas/functions/list');
      })
      .expect(200, done);
  });
});

describe('POST /functions/:namespace/:id', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
  });

  describe('when code is correct and does not exists', () => {
    it('should return the code', (done) => {
      const code = 'function main() {}';

      request(routes)
        .post('/functions/backstage/correct')
        .send({ code })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.profile).to.endsWith('/_schemas/functions/item');
        })
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

  describe('when code is correct and exists', () => {
    it('should returns an error', (done) => {
      const code = 'function main() {}';

      request(routes)
        .post('/functions/backstage/exists')
        .send({ code })
        .expect('Content-Type', /json/)
        .expect(500, {
          error: 'Code already exists',
        }, done);
    });
  });

  describe('when return any error from storage', () => {
    it('should return the code', (done) => {
      const code = 'function main() {}';

      request(routes)
        .post('/functions/backstage/error')
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
        .post('/functions/backstage/invalid')
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
        .post('/functions/codes/crazy')
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
        .post('/functions/codes/timeout')
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
        .post('/functions/codes/invalid')
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

describe('PUT /functions/:namespace/:id', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
  });

  describe('when code is correct', () => {
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


describe('PUT /functions/:namespace/:id/run', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
    routes.set('sandbox', new Sandbox({}));
  });

  describe('when code is found in cache', () => {
    it('should reuse compiled code from storage cache', (done) => {
      request(routes)
        .put('/functions/backstage/cached/run')
        .send({ args: [1, 2] })
        .expect(200, {
          result: 'cached',
          body: { args: [1, 2] },
        }, done);
    });
  });

  describe('when code is found in cache', () => {
    it('should reuse compiled code from storage cache', (done) => {
      request(routes)
        .put('/functions/backstage/send-string/run')
        .send({ args: [1, 2] })
        .expect('content-type', /json/)
        .expect(200, '"this is an alert"', done);
    });
  });

  describe('when code is not found in cache', () => {
    it('should compile code from storage', (done) => {
      request(routes)
        .put('/functions/backstage/fresh/run')
        .send({ args: [3, 4] })
        .expect(200, {
          result: 'fresh',
          body: { args: [3, 4] },
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

  describe('when error with custom status code is found', () => {
    it('should return a custom status code', (done) => {
      request(routes)
        .put('/functions/backstage/customError/run')
        .send({ args: [] })
        .expect(422, {
          error: 'Custom error',
        }, done);
    });
  });
});


describe('PUT /functions/pipeline', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
    routes.set('sandbox', new Sandbox({}));
  });

  describe('when there are no steps', () => {
    it('should return a bad request', (done) => {
      request(routes)
        .put('/functions/pipeline')
        .expect(400, {
          error: 'Pass step by querystring is required',
        }, done);
    });
  });

  describe('when step does not exists', () => {
    it('should return a not found request', (done) => {
      request(routes)
        .put('/functions/pipeline?steps[0]=backstage/not-found')
        .expect(404, {
          error: 'Code \'backstage/not-found\' is not found',
        }, done);
    });
  });

  describe('when step use two steps', () => {
    it('should return a result', (done) => {
      request(routes)
        .put('/functions/pipeline?steps[0]=backstage/step1&steps[1]=backstage/step2')
        .send({ x: 1 })
        .expect(200, { x: 200 }, done);
    });
  });
});


describe('PUT /functions/:namespace/:id/env/:env', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
  });

  describe('when pass a json string on body', () => {
    it('should create an enviroment variable', (done) => {
      request(routes)
        .put('/functions/backstage/correct/env/MY_VAR')
        .set('content-type', 'application/json')
        .send('"MY VALUE"')
        .expect(() => {
          const memoryStorage = routes.get('memoryStorage');
          expect(memoryStorage.lastEnvSet).to.be.eql({
            namespace: 'backstage',
            id: 'correct',
            env: 'MY_VAR',
            value: 'MY VALUE',
          });
        })
        .expect(204, done);
    });
  });

  describe('when the target function it\'s not exist', () => {
    it('should fail the request with 404 error', (done) => {
      request(routes)
        .put('/functions/backstage/not-found/env/MY_VAR')
        .set('content-type', 'application/json')
        .send('"MY VALUE"')
        .expect(404, {
          error: 'Function not found',
        }, done);
    });
  });

  describe('when not pass a json string on body', () => {
    it('should validate', (done) => {
      request(routes)
        .put('/functions/backstage/correct/env/MY_VAR')
        .send('wrong string')
        .expect('Content-Type', /json/)
        .expect(400, {
          error: 'Invalid instance',
          details: [
            'instance is not of a type(s) string',
          ],
        }, done);
    });
  });
});

describe('DELETE /functions/:namespace/:id/env/:env', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
  });

  describe('when sucessfully', () => {
    it('should delete an enviroment variable', (done) => {
      request(routes)
        .delete('/functions/backstage/correct/env/MY_VAR')
        .expect(() => {
          const memoryStorage = routes.get('memoryStorage');
          expect(memoryStorage.lastEnvUnset).to.be.eql({
            namespace: 'backstage',
            id: 'correct',
            env: 'MY_VAR',
          });
        })
        .expect(204, {}, done);
    });
  });

  describe('when the target function it\'s not exist', () => {
    it('should fail the request with 404 error', (done) => {
      request(routes)
        .delete('/functions/backstage/not-found/env/MY_VAR')
        .expect(404, {
          error: 'Function not found',
        }, done);
    });
  });
});
