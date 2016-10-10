const expect = require('chai').expect;
const SandboxResponse = require('../../../../lib/domain/sandbox/SandboxResponse');

describe('SandboxResponse', () => {
  describe('create a response successfully', () => {
    let res;
    let codeResponse;

    before((done) => {
      const callbackFn = (err, responseData) => {
        codeResponse = responseData;
        done();
      };
      res = new SandboxResponse({
        callback: callbackFn,
      });
      res.send({ result: 'ok' });
    });

    it('should sends the response with default status of 200', () => {
      expect(codeResponse.body).to.be.eql({ result: 'ok' });
      expect(codeResponse.status).to.be.eql(200);
    });

    it('should sends an empty header object when none is defined', () => {
      expect(codeResponse.headers).to.be.eql({});
    });
  });

  describe('create a response with created status code (201)', () => {
    let res;
    let codeResponse;

    before((done) => {
      const callbackFn = (err, responseData) => {
        codeResponse = responseData;
        done();
      };
      res = new SandboxResponse({
        callback: callbackFn,
      });
      res.status(201).send({ content: { name: 'foobar' } });
    });

    it('should sends the response with status of 201', () => {
      expect(codeResponse.body).to.be.eql({ content: { name: 'foobar' } });
      expect(codeResponse.status).to.be.eql(201);
    });
  });

  describe('set headers to be send as response', () => {
    let res;
    let codeResponse;

    before((done) => {
      const callbackFn = (err, responseData) => {
        codeResponse = responseData;
        done();
      };
      res = new SandboxResponse({
        callback: callbackFn,
      });
      res.set('X-FOO', 'bar');
      res.send({ result: 'ok' });
    });

    it('should sends the response with default status of 200', () => {
      expect(codeResponse.body).to.be.eql({ result: 'ok' });
      expect(codeResponse.status).to.be.eql(200);
    });
  });
});
