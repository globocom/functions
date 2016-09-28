const expect = require('chai').expect;
const sandbox = require('../lib/sandbox');

describe('Sandbox', () => {
    let testSandbox;

    before(() => {
        testSandbox = new sandbox.Sandbox();
    });

    describe('#createEmptyContext()', () => {
        let context;
        before(() => {
            context = testSandbox.createEmptyContext('test');
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
            expect(context.module).to.eql({exports: {}});
        });

        it('should return context with setTimeout', () => {
            expect(context.setTimeout).to.equal(setTimeout);
        });

        it('should return context with Buffer', () => {
            expect(context.Buffer).to.equal(Buffer);
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
                let code = `function main() {}`;

                let result = testSandbox.testSyntaxError('backstage', 'test', code);
                expect(result).to.be.null;
            });
        });

        describe('when code has any SyntaxError', () => {
            it('should raise an error', () => {
                let code = `var a = [};`;

                let result = testSandbox.testSyntaxError('backstage', 'test', code);
                expect(result.error).to.be.eql('SyntaxError: Unexpected token }');
                expect(result.stack).to.be.eql('');
            });
        });
    });
});
