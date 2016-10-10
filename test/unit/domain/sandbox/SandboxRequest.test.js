const expect = require('chai').expect;
const SandboxRequest = require('../../../../lib/domain/sandbox/SandboxRequest');

describe('SandboxRequest', () => {
  let externalRequest;
  before(() => {
    externalRequest = {
      headers: {
        host: 'localhost:3000',
        accept: '*/*',
      },
      query: { q: 'john' },
      body: { name: 'John doe' },
    };
  });

  describe('when we need to create new request with oud data', () => {
    it('should copy data that matches only some parameters of the request', () => {
      const req = new SandboxRequest(externalRequest);
      expect(req).to.have.all.keys('headers', 'query', 'body');
    });
  });
});
