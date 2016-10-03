const request = require('supertest');

const routes = require('../../../../lib/http/routes');
const schemas = require('../../../../lib/domain/schemas');

describe('GET /_schema/:schema', () => {
  describe('when schema is equals root', () => {
    it('should returns the schema for root properly', (done) => {
      request(routes)
        .get('/_schemas/root')
        .expect('content-type', /json/)
        .expect(200, schemas.root, done);
    });
  });

  describe('when schema is equals functions/list', () => {
    it('should returns the schema for functions list', (done) => {
      request(routes)
        .get('/_schemas/functions/list')
        .expect('content-type', /json/)
        .expect(200, schemas['functions/list'], done);
    });
  });

  describe('when schema is equals functions/item', () => {
    it('should returns the schema for function item', (done) => {
      request(routes)
        .get('/_schemas/functions/item')
        .expect('content-type', /json/)
        .expect(200, schemas['functions/item'], done);
    });
  });

  describe('when schema does not exist in functions', () => {
    it('should returns schema not found', (done) => {
      request(routes)
        .get('/_schemas/functions/foobar')
        .expect('content-type', /json/)
        .expect(404, { error: 'Schema not found' }, done);
    });
  });
});
