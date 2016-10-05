const request = require('supertest');

const routes = require('../../../../lib/http/routes');
const NotWorkingStorage = require('../../../fakes/NotWorkingStorage');
const WorkingStorage = require('../../../fakes/WorkingStorage');

describe('GET /healthcheck', () => {
  describe('when storage is working', () => {
    before(() => {
      routes.set('memoryStorage', new WorkingStorage());
    });

    it('should returns WORKING text string', (done) => {
      request(routes)
        .get('/healthcheck')
        .expect('content-type', /^text\/html/)
        .expect(200, 'WORKING', done);
    });
  });

  describe('when storage is not working', () => {
    before(() => {
      routes.set('memoryStorage', new NotWorkingStorage());
    });

    it('should returns Not working text string', (done) => {
      request(routes)
        .get('/healthcheck')
        .expect('content-type', /^text\/html/)
        .expect(500, 'Error: Not working', done);
    });
  });
});
