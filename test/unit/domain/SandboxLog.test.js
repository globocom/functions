const Logger = require('winston').Logger;
const expect = require('chai').expect;
const Memory = require('winston').transports.Memory;

const SandboxLog = require('../../../lib/domain/SandboxLog');

describe('SandboxLog', () => {
  let testLog;
  let memoryStream;

  beforeEach(() => {
    memoryStream = new Memory({ level: 'debug' });
    const logger = new Logger({
      transports: [memoryStream],
    });
    testLog = new SandboxLog('test', logger);
  });

  it('info', () => {
    testLog.info('is info', '123');
    expect(memoryStream.writeOutput).to.be.eql(['info: [test] is info 123']);
  });

  it('log', () => {
    testLog.log('is log', '321');
    expect(memoryStream.writeOutput).to.be.eql(['info: [test] is log 321']);
  });

  it('error', () => {
    testLog.error('is error', 'details:');
    expect(memoryStream.errorOutput).to.be.eql(['error: [test] is error details:']);
  });

  it('warn', () => {
    testLog.warn('is warn', 'details:');
    expect(memoryStream.writeOutput).to.be.eql(['warn: [test] is warn details:']);
  });

  it('debug', () => {
    testLog.debug('is debug');
    expect(memoryStream.errorOutput).to.be.eql(['debug: [test] is debug']);
  });
});
