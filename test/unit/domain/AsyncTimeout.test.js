const expect = require('chai').expect;
const AsyncTimeout = require('../../../lib/domain/AsyncTimeout');


describe('AsyncTimeout', () => {
  let asyncTimeout;

  before(() => {
    asyncTimeout = new AsyncTimeout();
  });

  describe('#add', () => {
    it('should add a new timeout', () => {
      const timeouts = asyncTimeout
              .clear()
              .add(() => {})
              .timeouts;
      expect(timeouts.length).to.be.eql(1);
    });

    describe('when timeout', () => {
      it('should call function', (done) => {
        asyncTimeout
          .clear()
          .add(() => {
            done();
          }, 10);
      });
    });
  });

  describe('#clear', () => {
    it('should clear timeouts', () => {
      const timeouts = asyncTimeout
              .clear()
              .add(() => {})
              .clear()
              .timeouts;
      expect(timeouts.length).to.be.eql(0);
    });
  });
});
