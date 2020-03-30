const Storage = require('../../../lib/domain/storage');
const expect = require('chai').expect;

describe('storage', () => {
  const storage = new Storage();

  describe('#ping', () => {
    it('should throws an unimplemented error', () => {
      const fn = () => storage.ping();
      expect(fn).to.throw(Error, /unimplemented method for Storage interface/);
    });
  });

  describe('#putCode', () => {
    it('should throws an unimplemented error', () => {
      const fn = () => storage.putCode();
      expect(fn).to.throw(Error, /unimplemented method for Storage interface/);
    });
  });

  describe('#getCode', () => {
    it('should throws an unimplemented error', () => {
      const fn = () => storage.getCode();
      expect(fn).to.throw(Error, /unimplemented method for Storage interface/);
    });
  });

  describe('#deleteCode', () => {
    it('should throws an unimplemented error', () => {
      const fn = () => storage.deleteCode();
      expect(fn).to.throw(Error, /unimplemented method for Storage interface/);
    });
  });

  describe('#getCodeByCache', () => {
    it('should throws an unimplemented error', () => {
      const fn = () => storage.getCodeByCache();
      expect(fn).to.throw(Error, /unimplemented method for Storage interface/);
    });
  });

  describe('#search', () => {
    it('should throws an unimplemented error', () => {
      const fn = () => storage.search();
      expect(fn).to.throw(Error, /unimplemented method for Storage interface/);
    });
  });

  describe('#getSentryByEnvOrNamespace', () => {
    it('should return sentryDSN from env', async () => {
      const code = {
        env: {
          sentryDSN: 'http://my-sentry.io/fooenv',
        },
        namespaceSettings: {
          sentryDSN: 'http://my-sentry.io/foo',
        },
      };
      const sentry = await Storage.getSentryByEnvOrNamespace(code);
      expect(sentry).to.be.eql('http://my-sentry.io/fooenv');
    });

    it('should return sentryDSN from namespace', async () => {
      const code = {
        namespaceSettings: {
          sentryDSN: 'http://my-sentry.io/foo',
        },
      };

      const sentry = await Storage.getSentryByEnvOrNamespace(code);
      expect(sentry).to.be.eql('http://my-sentry.io/foo');
    });

    it('should return null when sentryDSN isn`t configured', async () => {
      const sentry = await Storage.getSentryByEnvOrNamespace({});
      expect(sentry).to.be.null;
    });
  });
});
