const expect = require('chai').expect;
const SandboxRequire = require('../../../../lib/domain/sandbox/SandboxRequire');

const requireFunction = require;

describe('SandboxRequire', () => {
  let sandboxRequire;

  describe('generateRequire', () => {
    let encapsulatedRequire;

    before(() => {
      const myModule = {
        './module1': () => ({}),
        './mypackage/module2': () => ({}),
      };
      sandboxRequire = new SandboxRequire(myModule, '.');
      sandboxRequire.setGlobalModules(['http']);
      encapsulatedRequire = sandboxRequire.generateRequire();
    });

    describe('when we pass a valid module we want to require', () => {
      it('should returns the module insdie myModule is loaded', () => {
        expect(encapsulatedRequire('./module1')).to.be.eql({});
      });

      it('should returns an avaliable global module', () => {
        expect(encapsulatedRequire('http')).to.be.eql(requireFunction('http'));
      });
    });

    describe('when we pass an invalid module', () => {
      it('should throws an error if invokes a module that does not exist', () => {
        const fn = () => encapsulatedRequire('does-not-exist');
        expect(fn).to.throw(Error, /Cannot find module 'does-not-exist'/);
      });

      it('should throws an error when the module exists but is not accessible', () => {
        const fn = () => encapsulatedRequire('crypto');
        expect(fn).to.throw(Error, /Cannot find module 'crypto'/);
      });
    });
  });

  describe('generateRelativeRequire', () => {
    let relativeRequire;

    before(() => {
      const myModule = {
        './module1': () => ({}),
        './mypackage2/module2': () => ({}),
        './mypackage3/module3': () => ({}),
      };
      sandboxRequire = new SandboxRequire(myModule, '.');
      sandboxRequire.setGlobalModules(['http']);
      relativeRequire = sandboxRequire.generateRelativeRequire();
    });

    describe('when we pass a valid module we want to require', () => {
      it('should be able to call module2 inside mypackage', () => {
        const moduleRequire = relativeRequire('mypackage2');
        expect(moduleRequire('module2')).to.be.eql({});
      });

      it('should be able to call module1 by full path', () => {
        const moduleRequire = relativeRequire('mypackage2');
        expect(moduleRequire('./module1')).to.be.eql({});
      });

      it('should returns an avaliable global module', () => {
        const moduleRequire = relativeRequire('mypackage2');
        expect(moduleRequire('http')).to.be.eql(requireFunction('http'));
      });
    });

    describe('when we pass an invalid module', () => {
      it('should throws an error if invokes a module that does not exist', () => {
        const moduleRequire = relativeRequire('mypackage2');
        const fn = () => moduleRequire('does-not-exist');
        expect(fn).to.throw(Error, /Cannot find module 'does-not-exist'/);
      });

      it('should throws an error if invokes directly a module of another package', () => {
        const moduleRequire = relativeRequire('mypackage2');
        const fn = () => moduleRequire('module3');
        expect(fn).to.throw(Error, /Cannot find module 'module3'/);
      });

      it('should throws an error when the module exists but is not accessible', () => {
        const moduleRequire = relativeRequire('mypackage2');
        const fn = () => moduleRequire('crypto');
        expect(fn).to.throw(Error, /Cannot find module 'crypto'/);
      });
    });
  });
});
