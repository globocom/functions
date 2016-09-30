const expect = require('chai').expect;
const sandbox = require('../../../lib/domain/sandbox');

describe('Sandbox', () => {
  let testSandbox;

  before(() => {
    testSandbox = new sandbox.Sandbox();
  });

  describe('#createEmptyContext()', () => {
    let context;
    before(() => {
      context = testSandbox.createEmptyContext('backstage', 'test', {
        pluggedAction: true,
      });
    });

    it('should return context with Backstage modules', () => {
      expect(context.Backstage.modules).to.eql({});
    });

    it('should return context with console', () => {
      expect(context.console).to.exist;
    });

    it('should return context with exports', () => {
      expect(context.exports).to.eql({});
    });

    it('should return context with module', () => {
      expect(context.module).to.eql({ exports: {} });
    });

    it('should return context with setTimeout', () => {
      expect(context.setTimeout).to.equal(setTimeout);
    });

    it('should return context with Buffer', () => {
      expect(context.Buffer).to.equal(Buffer);
    });

    it('should allow to extends Backstage object', () => {
      expect(context.Backstage.pluggedAction).to.be.true;
    });

    it.skip('should return context with require', () => {
      expect(context.require).to.exist;
    });

    it.skip('should return context with relativeRequire', () => {
      expect(context.relativeRequire).to.exist;
    });

    it.skip('should return context with Backstage collection', () => {
      expect(context.Backstage.collection).to.exist;
    });
  });

  describe('#testSyntaxError()', () => {
    describe('when code is clean', () => {
      it('should not return any error', () => {
        const code = 'function main() {}';
        const result = testSandbox.testSyntaxError('backstage', 'test', code);

        expect(result).to.be.null;
      });
    });

    describe('when code has any SyntaxError', () => {
      it('should raise an error', () => {
        const code = 'var a = [};';
        const result = testSandbox.testSyntaxError('backstage', 'test', code);

        expect(result.error).to.be.eql('SyntaxError: Unexpected token }');
        expect(result.stack).to.be.eql('');
      });
    });
  });

  describe('#compileCode() and #runScript()', () => {
    describe('when code has a const variable', () => {
      it('should allow to compile two times', (done) => {
        const namespace = 'backstage';
        const id = 'test';

        const code1 = { code: 'const a = 10; function main(callback){callback(null, a);}' };
        const code2 = { code: 'const a = 20; function main(callback){callback(null, a);}' };

        const script1 = testSandbox.compileCode(namespace, id, code1);
        const script2 = testSandbox.compileCode(namespace, id, code2);

        Promise
          .all([
            testSandbox.runScript('backstage', 'test', script1, []),
            testSandbox.runScript('backstage', 'test', script2, []),
          ])
          .then(([a, b]) => {
            expect(a).to.be.eql(10);
            expect(b).to.be.eql(20);
            done();
          }, (error) => {
            done(error);
          });
      });
    });

    describe('when code has an error', () => {
      it('should resolve promise as rejected', (done) => {
        const namespace = 'backstage';
        const id = 'test';
        const code = { code: 'function main(callback){callback(new Error(\'An error\'));}' };
        const script = testSandbox.compileCode(namespace, id, code);

        testSandbox
          .runScript('backstage', 'test', script, [])
          .then(() => {
            done(new Error('It is expected an error'));
          }, (error) => {
            expect(error.message).to.be.eql('An error');
            done();
          });
      });
    });
  });
});
