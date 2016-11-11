const FunctionsRequest = require('../../../lib/http/FunctionsRequest');
const expect = require('chai').expect;
const sinon = require('sinon');

describe('FunctionsRequest', () => {
  describe('#schemeAndAuthority', () => {
    describe('when request has header x-forwarded-host', () => {
      it('it should return schemeAndAuthority with x-forwarded-host header value', () => {
        const req = { protocol: 'https' };
        req.get = sinon.stub();

        req.get.withArgs('Host').returns('hostheader.example.com:1234');
        req.get.withArgs('x-forwarded-host').returns('xforwardedhostheader.example.com');

        const functionsRequest = new FunctionsRequest(req);
        expect(functionsRequest.schemeAndAuthority()).to.be.eq('https://xforwardedhostheader.example.com');
      });
    });

    describe('when request does not have header x-forwarded-host', () => {
      it('it should return schemeAndAuthority with host header value', () => {
        const req = { protocol: 'https' };
        req.get = sinon.stub();

        req.get.withArgs('Host').returns('hostheader.example.com:1234');

        const functionsRequest = new FunctionsRequest(req);
        expect(functionsRequest.schemeAndAuthority()).to.be.eq('https://hostheader.example.com:1234');
      });
    });
  });
});
