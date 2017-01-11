const request = require('supertest');
const expect = require('chai').expect;

const routes = require('../../../../lib/http/routes');
const schemas = require('../../../../lib/domain/schemas');

describe('GET /_schema/:schema', () => {
  describe('when schema is equals root', () => {
    it('should returns the schema for root properly', (done) => {
      request(routes)
        .get('/_schemas/root')
        .expect('content-type', /json/)
        .expect((res) => {
          const host = res.request.host;
          expect(res.body.properties).to.be.eql(schemas.root.properties);
          expect(res.body.links).to.be.eql([
            {
              href: `http://${host}/functions`,
              rel: 'functions',
            },
            {
              href: `http://${host}/healthcheck`,
              rel: 'healthcheck',
            },
          ]);
        })
        .expect(200, done);
    });
  });

  describe('when schema is equals functions/list', () => {
    it('should returns the schema for functions list', (done) => {
      request(routes)
        .get('/_schemas/functions/list')
        .expect('content-type', /json/)
        .expect((res) => {
          const host = res.request.host;
          expect(res.body.properties).to.be.eql({
            items: {
              items: {
                $ref: `http://${host}/_schemas/functions/item`,
              },
              type: 'array',
            },
            nextPage: {
              type: 'integer',
            },
            page: {
              type: 'integer',
            },
            perPage: {
              type: 'integer',
            },
            previousPage: {
              type: 'integer',
            },
          });
          expect(res.body.links).to.be.eql([
            {
              href: `http://${host}/functions/{namespace}/{id}`,
              method: 'PUT',
              rel: 'update',
            },
            {
              href: `http://${host}/functions/{namespace}/{id}`,
              method: 'DELETE',
              rel: 'delete',
            },
            {
              href: `http://${host}/functions/{namespace}/{id}/run`,
              method: 'PUT',
              rel: 'run',
              schema: {
                type: 'object',
              },
            },
            {
              href: `http://${host}/functions/{namespace}/{id}/env/{envVar}`,
              method: 'PUT',
              rel: 'env-set',
              schema: {
                title: 'Value',
                type: 'string',
              },
            },
            {
              href: `http://${host}/functions/{namespace}/{id}/env/{envVar}`,
              method: 'DELETE',
              rel: 'env-unset',
            },
            {
              href: `http://${host}/functions/{namespace}/{id}`,
              method: 'POST',
              rel: 'add',
              schema: {
                $ref: `http://${host}/_schemas/functions/item`,
              },
            },
            {
              href: `http://${host}/functions?page={previousPage}&perPage={perPage}`,
              rel: 'previous',
            },
            {
              href: `http://${host}/functions?page={nextPage}&perPage={perPage}`,
              rel: 'next',
            },
            {
              href: `http://${host}/functions?page={page}&perPage={perPage}`,
              rel: 'page',
            },
          ]);
        })
        .expect(200, done);
    });
  });

  describe('when schema is equals functions/item', () => {
    it('should returns the schema for function item', (done) => {
      request(routes)
        .get('/_schemas/functions/item')
        .expect('content-type', /json/)
        .expect((res) => {
          const host = res.request.host;
          expect(res.body.properties).to.be.eql(schemas['functions/item'].properties);
          expect(res.body.links).to.be.eql([
            {
              href: `http://${host}/functions/{namespace}/{id}`,
              rel: 'self',
            },
            {
              href: `http://${host}/functions/{namespace}/{id}`,
              rel: 'item',
            },
            {
              href: `http://${host}/functions`,
              rel: 'parent',
            },
            {
              href: `http://${host}/functions/{namespace}/{id}`,
              method: 'POST',
              rel: 'create',
              schema: {
                $ref: `http://${host}/_schemas/functions/item`,
              },
            },
            {
              href: `http://${host}/functions/{namespace}/{id}`,
              method: 'PUT',
              rel: 'update',
            },
            {
              href: `http://${host}/functions/{namespace}/{id}`,
              method: 'DELETE',
              rel: 'delete',
            },
            {
              href: `http://${host}/functions/{namespace}/{id}/run`,
              method: 'PUT',
              rel: 'run',
              schema: {
                type: 'object',
              },
            },
            {
              href: `http://${host}/functions/{namespace}/{id}/env/{envVar}`,
              method: 'PUT',
              rel: 'env-set',
              schema: {
                title: 'Value',
                type: 'string',
              },
            },
            {
              href: `http://${host}/functions/{namespace}/{id}/env/{envVar}`,
              method: 'DELETE',
              rel: 'env-unset',
            },
          ]);
        })
        .expect(200, done);
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
