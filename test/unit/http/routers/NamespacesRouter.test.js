const request = require('supertest');
const chai = require('chai');
chai.use(require('chai-string'));

const expect = chai.expect;
const routes = require('../../../../lib/http/routes');
const FakeStorage = require('../../../fakes/FakeStorage');


describe('PUT /namespaces/:namespace', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
  });

  describe('when document is correct', () => {
    it('should return the code', (done) => {
      const sentryDSN = 'http://sentry.io/foo';

      request(routes)
        .put('/namespaces/valid')
        .send({ sentryDSN })
        .expect('Content-Type', /json/)
        .expect(() => {
          const memoryStorage = routes.get('memoryStorage');
          expect(memoryStorage.lastPutNamespace).to.be.eql({
            namespace: 'valid',
            sentryDSN,
          });
        })
        .expect(200, {
          namespace: 'valid',
          sentryDSN,
        }, done);
    });
  });

  describe('when return any error from storage', () => {
    it('should fail the request', (done) => {
      request(routes)
        .put('/namespaces/error')
        .send({ })
        .expect('Content-Type', /json/)
        .expect(500, {
          error: 'Storage error',
        }, done);
    });
  });

  describe('when code has an invalid attribute', () => {
    it('should return a error', (done) => {
      request(routes)
        .put('/namespaces/invalid')
        .send({ code: 'not-found' })
        .expect('Content-Type', /application\/json/)
        .expect(400, {
          error: 'Invalid instance',
          details: [
            'instance additionalProperty "code" exists in instance when not allowed',
          ],
        }, done);
    });
  });
});


describe('GET /namespaces/:namespace', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
  });

  describe('when namespace is not found', () => {
    it('should return 404 error', (done) => {
      request(routes)
        .get('/namespaces/not-found')
        .expect((res) => {
          expect(res.body.error).to.be.eql('Namespace not found');
        })
        .expect(404, done);
    });
  });

  describe('when namespace is found', () => {
    it('should return the namespace', (done) => {
      request(routes)
        .get('/namespaces/found')
        .expect((res) => {
          expect(res.body.namespace).to.be.eql('found');
        })
        .expect(200, done);
    });
  });

  describe('when raise an error', () => {
    it('should return the namespace', (done) => {
      request(routes)
        .get('/namespaces/error')
        .expect((res) => {
          expect(res.body.error).to.be.eql('Storage error');
        })
        .expect(500, done);
    });
  });
});


describe('DELETE /namespaces/:namespace', () => {
  before(() => {
    routes.set('memoryStorage', new FakeStorage());
  });

  describe('when delete is not sucessfully', () => {
    it('should return 500 error', (done) => {
      request(routes)
        .delete('/namespaces/error')
        .expect((res) => {
          expect(res.body.error).to.be.eql('Storage error');
        })
        .expect(500, done);
    });
  });

  describe('when delete is successfully', () => {
    it('should return 204', (done) => {
      request(routes)
        .delete('/namespaces/found')
        .expect(204, done);
    });
  });
});
