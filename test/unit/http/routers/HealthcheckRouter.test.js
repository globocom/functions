const request = require('supertest');

const routes = require('../../../../lib/http/routes');

describe('GET /healthcheck', () => {
  it('should returns WORKING text string', (done) => {
    request(routes)
      .get('/healthcheck')
      .expect('content-type', /^text\/html/)
      .expect(200, 'WORKING', done);
  });
});
