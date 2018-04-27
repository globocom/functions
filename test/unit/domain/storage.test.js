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
});
