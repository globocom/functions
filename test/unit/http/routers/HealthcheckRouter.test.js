/* eslint class-methods-use-this: ['error', { "exceptMethods": ['ping']}] */

const request = require('supertest');

const routes = require('../../../../lib/http/routes');
const Storage = require('../../../../lib/domain/storage');


class WorkingStorage extends Storage {
  ping() {
    return new Promise((accept) => {
      accept('PONG');
    });
  }
}

class NotWorkingStorage extends Storage {
  ping() {
    return new Promise((accept, reject) => {
      reject(new Error('Unexpected error'));
    });
  }
}


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

    it('should returns ERROR text string', (done) => {
      request(routes)
        .get('/healthcheck')
        .expect('content-type', /^text\/html/)
        .expect(500, 'ERROR: Unexpected error', done);
    });
  });
});
