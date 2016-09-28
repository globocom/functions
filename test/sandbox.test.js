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

        it('should return context with Backstage defines', () => {
            expect(context.Backstage.defines).to.eql({});
        });

        it('should return context with Backstage define', () => {
            expect(context.Backstage.define).to.exist;
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

        it('should return context with define', () => {
            expect(context.define).to.exist;
        });

        it.skip('should return context with Backstage collection', () => {
            expect(context.Backstage.collection).to.exist;
        });
    });

    describe('#discoveryDefines()', () => {
        describe('when some functions are defined', () => {
            it('should return found defines', () => {
                let code = `define('preChule', ()=> {});
                Backstage.define('beforeSave', () => {});
                `;

                let defines = testSandbox.discoveryDefines('test', code);
                expect(defines).to.be.eql([
                    'preChule',
                    'beforeSave',
                ]);
            });
        });

        describe('when any functions are not defined', () => {
            it('should return found defines', () => {
                let code = `function none() {};
                none();
                `;

                let defines = testSandbox.discoveryDefines('test', code);
                expect(defines).to.be.eql([]);
            });
        });
    });
});
