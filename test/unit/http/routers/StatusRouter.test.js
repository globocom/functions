const request = require('supertest');

const expect = require('chai').expect;
const routes = require('../../../../lib/http/routes');
const Storage = require('../../../../lib/domain/storage');

class WorkingStorage extends Storage {
  constructor(name = 'TestStorage') {
    super(name);
  }

  ping() {
    return new Promise((accept) => {
      accept('OK');
    });
  }
}

class NotWorkingStorage extends Storage {
  constructor(name = 'TestStorage') {
    super(name);
  }

  ping() {
    return new Promise((accept, reject) => {
      reject(new Error('Not working'));
    });
  }
}

describe('GET /status', () => {
  describe('when storage is working', () => {
    before(() => {
      routes.set('memoryStorage', new WorkingStorage());
    });

    it('should returns OK text string', (done) => {
      request(routes)
        .get('/status')
        .expect('content-type', /^application\/json/)
        .expect((res) => {
          expect(res.body.services[0].message).to.be.eql('OK')
        })
        .expect(200, done);
    });
  });

  describe('when storage is not working', () => {
    before(() => {
      routes.set('memoryStorage', new NotWorkingStorage());
    });

    it('should returns Not working text string', (done) => {
      request(routes)
        .get('/status')
        .expect('content-type', /^application\/json/)
        .expect((res) => {
          expect(res.body.services[0].message).to.be.eql('Error: Not working')
        })
        .expect(500, done);
    });
  });
});
