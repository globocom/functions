const expect = require('chai').expect;
const SandboxRequire = require('../../../../lib/domain/sandbox/SandboxRequire');

describe('SandboxRequire', () => {
  let sandboxRequire;

  before(() => {
    const myModule = {
      'module1': () => { return {} },
      'module2': () => { return {} },
    };
    sandboxRequire = new SandboxRequire(myModule, '.');
    sandboxRequire.setGlobalModules(['http']);
    encapsulatedRequire = sandboxRequire.generateRequire();
  });

  describe('when we pass a valid module we want to require', () => {
    it('should returns the module insdie myModule is loaded', () => {
      expect(encapsulatedRequire('module1')).to.be.eql({});
    });

    it('should returns an avaliable global module', () => {
      expect(encapsulatedRequire('http')).to.be.eql(require('http'));
    });
  });

  describe('when we pass an invalid module', () => {
    it('should throws an error if invokes a module that does not exist', () => {
      let fn = () => encapsulatedRequire('does-not-exist');
      expect(fn).to.throw(Error, /Cannot find module 'does-not-exist'/)
    });

    it('should throws an error when the module exists but is not accessible', () => {
      let fn = () => encapsulatedRequire('crypto');
      expect(fn).to.throw(Error, /Cannot find module 'crypto'/)
    });
  });
});
