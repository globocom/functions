const expect = require('chai').expect;
const deepcopy = require('deepcopy');
const sinon = require('sinon');
const EventEmitter = require('events');
const uuidV4 = require('uuid/v4');

const StorageRedis = require('../../../../lib/domain/storage/redis');
const config = require('../../../../lib/support/config');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('StorageRedis', () => {
  let storage;

  before(() => {
    const newOptions = deepcopy(config.redis);
    newOptions.enableOfflineQueue = true;
    newOptions.keyPrefix = 'test:';
    newOptions.heartBeatTimeout = 0.001;
    newOptions.heartBeatStanch = 0.001;

    storage = new StorageRedis(newOptions);
  });

  describe('#ping()', () => {
    it('should return pong', async () => {
      const res = await storage.ping();
      expect(res).to.be.eql('PONG');
    });
  });


  describe('#putCode() and #getCode()', () => {
    it('should write a hash for the code', async () => {
      const code = {
        id: 'test',
        code: 'a = 1;',
        hash: '123',
        env: {
          CLIENT_ID: 'my client id',
          MY_VAR: 'my var',
        },
      };
      const x = await storage.putCode('backstage', 'test', code);
      expect(x).to.be.eql('OK');

      const code2 = await storage.getCode('backstage', 'test');

      expect(code2.id).to.be.eql('test');
      expect(code2.namespace).to.be.eql('backstage');
      expect(code2.code).to.be.eql('a = 1;');
      expect(code2.hash).to.be.eql('123');
      expect(code2.versionID).to.match(UUID_REGEX);
      expect(code2.env.CLIENT_ID).to.be.eql('my client id');
      expect(code2.env.MY_VAR).to.be.eql('my var');
    });

    it('should have a created equal updated for new function', async () => {
      const code = {
        id: uuidV4(),
        code: 'a = 2;',
        hash: '123',
      };

      const x = await storage.putCode('backstage', code.id, code);
      expect(x).to.be.eql('OK');

      const code2 = await storage.getCode('backstage', code.id);
      expect(code2.created).to.be.eql(code2.updated);
    });
  });


  describe('#getCode()', () => {
    describe('when code id is not found', () => {
      it('should yield a null', async () => {
        const code = await storage.getCode('backstage', 'not-found');
        expect(code).to.be.null;
      });
    });

    // when code is found is already tested above
  });

  describe('#delete()', () => {
    it('should write a hash for the code', async () => {
      const id = 'test';
      const namespace = 'backstage';
      const code = {
        id,
        code: 'a = 1;',
        hash: '123',
      };
      const putResponse = await storage.putCode(namespace, id, code);
      expect(putResponse).to.be.eql('OK');

      const deleteResponse = await storage.deleteCode(namespace, id);
      expect(deleteResponse).to.be.eql(1);

      const code2 = await storage.getCode(namespace, id);
      expect(code2).to.be.null;
    });
  });

  describe('#getCodeByCache', () => {
    describe('when code is not found in storage', () => {
      it('should populate item by preCache', async () => {
        const preCache = (code) => {
          code.neverCalled = true;
          return code;
        };

        const namespace = 'backstage';
        const id = 'cache-000';

        const cacheResponse = await storage.getCodeByCache(namespace, id, { preCache });
        expect(cacheResponse).to.be.null;
      });
    });

    describe('when code is not found in cache', () => {
      it('should populate item by preCache', async () => {
        const preCache = (code) => {
          code.preCached = true;
          preCache.called = true;
          return code;
        };

        const namespace = 'backstage';
        const id = 'cache-01';
        const code = {
          id,
          code: 'b = 1;',
          hash: '123',
        };

        const putResponse = await storage.putCode(namespace, id, code);
        expect(putResponse).to.be.eql('OK');

        const cacheResponse = await storage.getCodeByCache(namespace, id, { preCache });

        expect(cacheResponse.preCached).to.be.true;
        expect(preCache.called).to.be.true;
      });
    });

    describe('when code is found in cache and not changed', () => {
      it('should return item by cache', async () => {
        const preCache = (code) => {
          code.preCached = true;
          preCache.called = true;
          return code;
        };

        const namespace = 'backstage';
        const id = 'cache-02';
        const code = {
          id,
          code: 'b = 1;',
          hash: '123a',
        };
        const putResponse = await storage.putCode(namespace, id, code);
        expect(putResponse).to.be.eql('OK');


        let cacheResponse = await storage.getCodeByCache(namespace, id, { preCache });
        expect(cacheResponse.preCached).to.be.true;
        preCache.called = false;
        const lastVersionID = cacheResponse.versionID;

        cacheResponse = await storage.getCodeByCache(namespace, id, { preCache });
        expect(cacheResponse.id).to.be.eql(id);
        expect(cacheResponse.code).to.be.eql('b = 1;');
        expect(cacheResponse.hash).to.be.eql('123a');
        expect(cacheResponse.versionID).to.match(UUID_REGEX);
        expect(cacheResponse.versionID).to.be.eql(lastVersionID);
        expect(preCache.called).to.be.false;
      });
    });

    describe('when code is found in cache and is changed', () => {
      it('should repopulate changed item', async () => {
        const preCache = (code) => {
          code.preCachedByHash = code.hash;
          preCache.called = true;
          return code;
        };

        const namespace = 'backstage';
        const id = 'cache-03';
        const code = {
          id,
          code: 'c = 1;',
          hash: '123a',
        };

        const putResponse = await storage.putCode(namespace, id, code);

        expect(putResponse).to.be.eql('OK');
        // populate the cache
        let cacheResponse = await storage.getCodeByCache(namespace, id, { preCache });
        expect(cacheResponse.preCachedByHash).to.be.eql('123a');

        // change item in database
        code.code = 'd = 2;';
        code.hash = '123b';
        const lastVersionID = cacheResponse.versionID;
        await storage.putCode(namespace, id, code);
        preCache.called = false;

        cacheResponse = await storage.getCodeByCache(namespace, id, { preCache });

        expect(cacheResponse.id).to.be.eql(id);
        expect(cacheResponse.code).to.be.eql('d = 2;');
        expect(cacheResponse.preCachedByHash).to.be.eql('123b');
        expect(cacheResponse.hash).to.be.eql('123b');
        expect(cacheResponse.versionID).to.match(UUID_REGEX);
        expect(cacheResponse.versionID).to.be.not.eql(lastVersionID);
        expect(preCache.called).to.be.true;
      });
    });
  });

  describe('getCodesByCache', () => {
    const preCache = (code) => {
      code.preCached = true;
      code.preCachedByVersionID = code.versionID;
      return code;
    };

    let code1;
    let code2;

    beforeEach(() => {
      code1 = {
        namespace: 'backstage',
        id: 'code1',
        code: 'c = 1;',
        hash: '123a',
      };

      code2 = {
        namespace: 'backstage',
        id: 'code2',
        code: 'c = 1;',
        hash: '123b',
      };
    });

    describe('when all codes are not found', () => {
      it('should return null for each code', async () => {
        code1.id = 'not-found1';
        code2.id = 'not-found2';

        const result = await storage.getCodesByCache([code1, code2], { preCache });
        expect(result).to.be.eql([null, null]);
      });
    });

    describe('when all codes are found', () => {
      it('should return all codes', async () => {
        const [putResponse1, putResponse2] = await Promise.all([
          storage.putCode(code1.namespace, code1.id, code1),
          storage.putCode(code2.namespace, code2.id, code2),
        ]);

        expect(putResponse1).to.be.eql('OK');
        expect(putResponse2).to.be.eql('OK');

        const [result1, result2] = await storage.getCodesByCache([code1, code2], { preCache });
        expect(result1.preCached).to.be.true;
        expect(result2.preCached).to.be.true;
      });
    });

    describe('when some code are updated', () => {
      it('should return all codes', async () => {
        const [putResponse1, putResponse2] = await Promise.all([
          storage.putCode(code1.namespace, code1.id, code1),
          storage.putCode(code2.namespace, code2.id, code2),
        ]);

        expect(putResponse1).to.be.eql('OK');
        expect(putResponse2).to.be.eql('OK');

        const [savedCode1, savedCode2] = await Promise.all([
          storage.getCode(code1.namespace, code1.id),
          storage.getCode(code2.namespace, code2.id),
        ]);

        const code1VersionID = savedCode1.versionID;
        const code2VersionID = savedCode2.versionID;

        let [result1, result2] = await storage
              .getCodesByCache([code1, code2], { preCache });

        expect(result1.preCached).to.be.true;
        expect(result2.preCached).to.be.true;
        code2.code = 'console.info("changed");';

        const putResponse = await storage.putCode(code2.namespace, code2.id, code2);
        expect(putResponse).to.be.eql('OK');

        [result1, result2] = await storage.getCodesByCache([code1, code2], { preCache });
        expect(result1.preCachedByVersionID).to.be.eql(code1VersionID);
        expect(result2.preCachedByVersionID).to.be.not.eql(code2VersionID);
      });
    });
  });

  describe('#putCodeEnviromentVariable', () => {
    describe('when target function is found', () => {
      it('should set enviroment variable', async () => {
        const varName = 'MY_SKIP';
        const code = {
          namespace: 'backstage',
          id: 'test-env',
          code: 'a = 1;',
          hash: '123',
        };
        const x = await storage.putCode(code.namespace, code.id, code);
        expect(x).to.be.eql('OK');

        await storage.putCodeEnviromentVariable(code.namespace, code.id, varName, 'true');

        const { env, code: source } = await storage.getCode(code.namespace, code.id);
        expect(source).to.be.eql(code.code);
        expect(env).to.be.eql({
          MY_SKIP: 'true',
        });
      });
    });

    describe('when target function is not found', () => {
      it('should raise an error', async () => {
        try {
          await storage.putCodeEnviromentVariable('backstage', 'test-env-not-found', 'MY_SKIP', 'true');
        } catch (err) {
          expect(err.message).to.be.eql('Function not found');
          expect(err.statusCode).to.be.eql(404);
          return;
        }

        throw new Error('Not raised an expection');
      });
    });
  });

  describe('#deleteCodeEnviromentVariable', () => {
    describe('when target function and target enviroment var is found', () => {
      it('should unset enviroment variable', async () => {
        const varName = 'TO_BE_DELETE';
        const code = {
          namespace: 'backstage',
          id: 'test-env-unset',
          code: 'a = 1;',
          hash: '123',
          env: {},
        };
        code.env[varName] = 'me';

        const x = await storage.putCode(code.namespace, code.id, code);
        expect(x).to.be.eql('OK');

        await storage.deleteCodeEnviromentVariable(code.namespace, code.id, varName);

        const { env, code: source } = await storage.getCode(code.namespace, code.id);
        expect(source).to.be.eql(code.code);
        expect(env).to.be.eql({});
      });
    });

    describe('when target enviroment var is not found', () => {
      it('should unset enviroment variable', async () => {
        const varName = 'TO_BE_DELETE';
        const code = {
          namespace: 'backstage',
          id: 'test-env-unset',
          code: 'a = 1;',
          hash: '123',
          env: {
            TO_MAINTAIN: 'true',
          },
        };

        try {
          const x = await storage.putCode(code.namespace, code.id, code);
          expect(x).to.be.eql('OK');
          await storage.deleteCodeEnviromentVariable(code.namespace, code.id, varName);
          throw new Error('Not raised an expection');
        } catch (err) {
          expect(err.message).to.be.eql('Env variable not found');
          expect(err.statusCode).to.be.eql(404);
        }

        const { env, code: source } = await storage.getCode(code.namespace, code.id);
        expect(source).to.be.eql(code.code);
        expect(env).to.be.eql({
          TO_MAINTAIN: 'true',
        });
      });
    });

    describe('when function is not found', () => {
      it('should unset enviroment variable', async () => {
        const varName = 'TO_BE_DELETE';
        const code = {
          namespace: 'backstage',
          id: 'test-env-not-found',
        };

        try {
          await storage.deleteCodeEnviromentVariable(code.namespace, code.id, varName);
        } catch (err) {
          expect(err.message).to.be.eql('Function not found');
          expect(err.statusCode).to.be.eql(404);
          return;
        }

        throw new Error('Not raised an expection');
      });
    });
  });

  describe('#getNamespace', () => {
    describe('when namespace it is not exist', () => {
      it('should return null', async () => {
        const result = await storage.getNamespace('not-found');
        expect(result).to.be.null;
      });
    });

    describe('when namespace exists', () => {
      it('should return related namespace', async () => {
        await storage.putNamespace('will-found', {
          namespace: 'will-found',
          sentryDSN: 'http://my-sentry.io/foo',
        });

        const { namespace, sentryDSN } = await storage.getNamespace('will-found');
        expect(sentryDSN).to.be.eql('http://my-sentry.io/foo');
        expect(namespace).to.be.eql('will-found');
      });
    });
  });

  describe('#deleteNamespace', () => {
    it('should remove namespace', async () => {
      await storage.putNamespace('will-delete', {
        namespace: 'will-delete',
        sentryDSN: 'http://my-sentry.io/foo',
      });

      const { namespace } = await storage.getNamespace('will-delete');
      expect(namespace).to.be.eql('will-delete');

      await storage.deleteNamespace(namespace);

      const result = await storage.getNamespace('will-delete');
      expect(result).to.be.null;
    });
  });

  describe('#checkConnectionLeak()', () => {
    let sandbox;
    let fakeWorker;

    class FakeWorker extends EventEmitter {
      kill() {
        this.killed = true;
        this.emit('kill');
      }

      disconnect() {
        this.disconnected = true;
        this.emit('disconnect');
      }
    }

    before(() => {
      sandbox = sinon.sandbox.create();
      fakeWorker = new FakeWorker();
      sandbox.stub(storage, 'worker').value(fakeWorker);
      sandbox.stub(storage, 'ping').callsFake(() => new Promise(() => {}));
    });

    after(() => {
      sandbox.restore();
    });

    it('should disconnect and kill worker after a connection leak', (done) => {
      storage.checkConnectionLeak();
      fakeWorker.on('kill', () => {
        expect(fakeWorker.killed).to.be.eql(true);
        expect(fakeWorker.disconnected).to.be.eql(true);
        done();
      });
    });
  });

  describe('#search()', () => {
    describe('with valid values', () => {
      beforeEach(() => {
        storage.setNamespaceMember('namespace1', 'function1');
        storage.setNamespaceMember('namespace1', 'function2');
        storage.setNamespaceMember('namespace2', 'function1');
      });

      it('with namespace', async () => {
        const list = await storage.search('namespace1');
        expect(list).to.deep.equal({
          items: [
            {
              id: 'function1',
              namespace: 'namespace1',
            },
            {
              id: 'function2',
              namespace: 'namespace1',
            },
          ],
          nextPage: 2,
          page: 1,
          perPage: 10,
        });
      });

      it('with namespace and id', async () => {
        const list = await storage.search('namespace1', 'function1');
        expect(list).to.deep.equal({
          items: [
            {
              id: 'function1',
              namespace: 'namespace1',
            },
          ],
          nextPage: 2,
          page: 1,
          perPage: 10,
        });
      });
    });

    describe('with invalid values', () => {
      it('without namespace and function id', async () => {
        const list = await storage.search('invalid-namespace', 'id');
        expect(list).to.deep.equal({
          items: [],
          nextPage: 2,
          page: 1,
          perPage: 10,
        });
      });
    });
  });
});
