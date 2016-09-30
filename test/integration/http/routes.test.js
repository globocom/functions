const request = require('supertest');

const routes = require('../../../lib/http/routes');

describe('PUT /functions/:namespace/:id', () => {
  describe('when code is clean', () => {
    it('should return a error', (done) => {
      const code = 'function main() {}';

      request(routes)
        .put('/functions/backstage/correct')
        .send({ code })
        .expect('Content-Type', /json/)
        .expect(200, {
          id: 'correct',
          code: 'function main() {}',
          hash: 'c177063dc3780c2fe9b4fdc913650e8147c9b8b0',
        }, done);
    });
  });

  describe('when code has a syntax error', () => {
    it('should return a error', (done) => {
      request(routes)
        .put('/functions/backstage/invalid')
        .send({ code: '{)' })
        .expect('Content-Type', /json/)
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
        .expect('Content-Type', /json/)
        .expect(400, {
          error: 'Invalid instance',
          details: [
            'instance.code is not of a type(s) string',
          ],
        }, done);
    });
  });
});
