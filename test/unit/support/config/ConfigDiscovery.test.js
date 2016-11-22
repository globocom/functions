const expect = require('chai').expect;
const ConfigDiscovery = require('../../../../lib/support/config/ConfigDiscovery');

describe('ConfigDiscovery', () => {
  describe('#getInt', () => {
    before(() => {
      process.env.DEFINED_GET_INT = '50';
    });

    it('should returns the default value when env is not defined', () => {
      expect(ConfigDiscovery.getInt('NOT_DEFINED', 42)).to.be.eql(42);
    });

    it('should returns the defined env', () => {
      expect(ConfigDiscovery.getInt('DEFINED_GET_INT', 0)).to.be.eql(50);
    });
  });

  describe('#getList', () => {
    before(() => {
      process.env.DEFINED_GET_LIST = 'leftpad,  underscore  ,react';
    });

    it('should returns the default list when env is not default', () => {
      const defaultList = ['request', 'lodash', 'leftpad'];
      expect(ConfigDiscovery.getList('NOT_DEFINED', defaultList)).to.be.eql(defaultList);
    });

    it('should returns the defined env', () => {
      const defaultList = ['leftpad', 'underscore', 'react'];
      expect(ConfigDiscovery.getList('DEFINED_GET_LIST', defaultList)).to.be.eql(defaultList);
    });
  });

  describe('#getPossibleString', () => {
    it('should returns the default value when no env is match', () => {
      const possibleString = ConfigDiscovery.getPossibleString(
        ['NOT_DEFINED', 'NOT_DEFINED_2'],
        'possiblestringvalue'
      );
      expect(possibleString).to.be.eql('possiblestringvalue');
    });
  });

  describe('#parseRedisOptions', () => {
    let oldRedisEndpoint;
    let oldSentinelEndpoint;

    before(() => {
      oldRedisEndpoint = process.env.REDIS_ENDPOINT;
      oldSentinelEndpoint = process.env.DBAAS_SENTINEL_ENDPOINT;
      delete process.env.REDIS_ENDPOINT;
      delete process.env.DBAAS_SENTINEL_ENDPOINT;
    });

    after(() => {
      process.env.REDIS_ENDPOINT = oldRedisEndpoint;
      process.env.DBAAS_SENTINEL_ENDPOINT = oldSentinelEndpoint;
    });

    it('should parse the default redis options', () => {
      const parsedOptions = ConfigDiscovery.parseRedisOptions();

      expect(parsedOptions.password).to.be.eql('');
      expect(parsedOptions.keyPrefix).to.be.eql('test');
      expect(parsedOptions.heartBeatSeconds).to.be.eql(5);
      expect(parsedOptions.heartBeatTimeout).to.be.eql(5);
      expect(parsedOptions.heartBeatStanch).to.be.eql(2);
      expect(parsedOptions.sentinels).to.be.eql([
        { host: '127.0.0.1', port: '16380' },
        { host: '127.0.0.1', port: '16381' },
        { host: '127.0.0.1', port: '16382' },
      ]);
    });
  });
});
