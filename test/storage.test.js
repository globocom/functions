const expect = require('chai').expect;
const deepcopy = require('deepcopy');

const Storage = require('../lib/storage');
const config = require('../lib/config');

describe('Storage', () => {
    let storage;

    before(() => {
        let newOptions = deepcopy(config.redisSentinel);
        newOptions.enableOfflineQueue = true;
        newOptions.keyPrefix = 'test:';

        storage = new Storage(newOptions);
    });

    describe('#ping()', () => {
        it('should return pong', (done) => {
            storage.ping().then((res) => {
                expect(res).to.be.eql('PONG');
                done();
            }, (err) => {
                done(err);
            });
        });
    });


    describe('#putCode() and #getCode()', () => {
        it('should write a hash for the code', (done) => {
            let code = {
                id: 'test',
                code: 'a = 1;',
                hash: '123',
                defines: ['a', 'b'],
            };
            storage.putCode('test', code)
                .then((x) => {
                    expect(x).to.be.eql('OK');
                    return storage.getCode('test');
                })
                .then((code) => {
                    expect(code.id).to.be.eql('test');
                    expect(code.code).to.be.eql('a = 1;');
                    expect(code.hash).to.be.eql('123');
                    expect(code.defines).to.be.eql(['a', 'b']);
                    done();
                }, (err) => {
                    done(err);
                });
        });
    });


    describe('#getCode()', () => {
        describe('when code id not is found', () => {
            it('should yield a null', (done) => {
                storage.getCode('not-found').then((code) => {
                    expect(code).to.be.null;
                    done();
                }, (err) => {
                    done(err);
                });
            });
        });

        //when code is found is already tested above
    });

    describe('#delete()', () => {
        it('should write a hash for the code', (done) => {
            let id = 'test';
            let code = {
                id,
                code: 'a = 1;',
                hash: '123',
                defines: ['a', 'b'],
            };
            storage.putCode('test', code)
                .then((putResponse) => {
                    expect(putResponse).to.be.eql('OK');
                    return storage.deleteCode(id);
                })
                .then((deleteResponse) => {
                    expect(deleteResponse).to.be.eql(1);
                    return storage.getCode(id);
                })
                .then((code) => {
                    expect(code).to.be.null;
                    done();
                } , (err) => {
                    done(err);
                });
        });
    });

    describe('#getCodeByCache', () => {
        describe('when code is not found in storage', () => {
            it('should populate item by preCache', (done) => {
                let preCache = (code) => {
                    code.neverCalled = true;
                    return code;
                };

                let id = 'cache-000';

                storage
                    .getCodeByCache(id, {preCache})
                    .then((cacheResponse) => {
                        expect(cacheResponse).to.be.null;
                        done();
                    }, (err) => {
                        done(err);
                    });
            });
        });

        describe('when code is not found in cache', () => {
            it('should populate item by preCache', (done) => {
                let preCache = (code) => {
                    code.preCached = true;
                    preCache.called = true;
                    return code;
                };

                let id = 'cache-01';
                let code = {
                    id,
                    code: 'b = 1;',
                    hash: '123',
                    defines: ['b'],
                };

                storage
                    .putCode(id, code)
                    .then((putResponse) => {
                        expect(putResponse).to.be.eql('OK');
                        return storage.getCodeByCache(id, {preCache});
                    })
                    .then((cacheResponse) => {
                        expect(cacheResponse.preCached).to.be.true;
                        expect(preCache.called).to.be.true;
                        done();
                    }, (err) => {
                        done(err);
                    });
            });
        });

        describe('when code is found in cache and not changed', () => {
            it('should return item by cache', (done) => {
                let preCache = (code) => {
                    code.preCached = true;
                    preCache.called = true;
                    return code;
                };

                let id = 'cache-02';
                let code = {
                    id,
                    code: 'b = 1;',
                    hash: '123a',
                    defines: ['b'],
                };

                storage
                    .putCode(id, code)
                    .then((putResponse) => {
                        expect(putResponse).to.be.eql('OK');
                        return storage.getCodeByCache(id, {preCache});
                    })
                    .then((cacheResponse) => {
                        expect(cacheResponse.preCached).to.be.true;
                        preCache.called = false;
                        return storage.getCodeByCache(id, {preCache});
                    })
                    .then((cacheResponse) => {
                        expect(cacheResponse.id).to.be.eql(id);
                        expect(cacheResponse.code).to.be.eql('b = 1;');
                        expect(cacheResponse.hash).to.be.eql('123a');
                        expect(preCache.called).to.be.false;
                        done();
                    }, (err) => {
                        done(err);
                    });
            });
        });

        describe('when code is found in cache and is changed', () => {
            it('should repopulate changed item', (done) => {
                let preCache = (code) => {
                    code.preCachedByHash = code.hash;
                    preCache.called = true;
                    return code;
                };

                let id = 'cache-03';
                let code = {
                    id,
                    code: 'c = 1;',
                    hash: '123a',
                    defines: ['c'],
                };

                storage
                    .putCode(id, code)
                    .then((putResponse) => {
                        expect(putResponse).to.be.eql('OK');
                        // populate the cache
                        return storage.getCodeByCache(id, {preCache});
                    })
                    .then((cacheResponse) => {
                        expect(cacheResponse.preCachedByHash).to.be.eql('123a');

                        // change item in database
                        code.code = 'd = 2;';
                        code.hash = '123b';
                        return storage.putCode(id, code);
                    })
                    .then((putResponse) => {
                        preCache.called = false;
                        return storage.getCodeByCache(id, {preCache});
                    })
                    .then((cacheResponse) => {
                        expect(cacheResponse.id).to.be.eql(id);
                        expect(cacheResponse.code).to.be.eql('d = 2;');
                        expect(cacheResponse.preCachedByHash).to.be.eql('123b');
                        expect(cacheResponse.hash).to.be.eql('123b');
                        expect(preCache.called).to.be.true;
                        done();
                    }, (err) => {
                        done(err);
                    });
            });
        });
    });
});
