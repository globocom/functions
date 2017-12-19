const expect = require('chai').expect;
const sinon = require('sinon');
const Status = require('../../../lib/domain/status');
const ErrorTracker = require('../../../lib/domain/ErrorTracker');
const NotWorkingStorage = require('../../fakes/NotWorkingStorage');
const WorkingStorage = require('../../fakes/WorkingStorage');

describe('Status', () => {
  describe('run', () => {
    const status1 = new Status(new WorkingStorage());
    const status2 = new Status(new NotWorkingStorage());
    const properties = ['name', 'status', 'message', 'time'];
    let sinonSandbox;

    beforeEach(() => {
      sinonSandbox = sinon.sandbox.create();
    });

    afterEach(() => {
      sinonSandbox.restore();
    });

    it('should contain mandatory properties on response', async () => {
      sinonSandbox.stub(ErrorTracker, 'ping').resolves('Mocked');
      const services1 = await status1.run();
      const services2 = await status2.run();

      expect(services1[0]).to.include.keys(properties);
      expect(services2[0]).to.include.keys(properties);

      expect(services1[1]).to.include.keys(properties);
      expect(services2[1]).to.include.keys(properties);
    });

    describe('when storage service is up', () => {
      it('should show WORKING status', async () => {
        sinonSandbox.stub(ErrorTracker, 'ping').resolves('Mocked');
        const services = await status1.run();
        expect(services[0].status).to.eq('WORKING');
      });
    });

    describe('when storage service is down', () => {
      it('should show FAILED status', async () => {
        sinonSandbox.stub(ErrorTracker, 'ping').resolves('Mocked');
        const services = await status2.run();
        expect(services[0].status).to.eq('FAILED');
      });
    });

    describe('when error tracker is up', () => {
      it('should show WORKING status', async () => {
        sinonSandbox.stub(ErrorTracker, 'ping').resolves('Mocked');
        const services = await status1.run();

        expect(services[1].name).to.be.eql('Sentry');
        expect(services[1].status).to.be.eql('WORKING');
        expect(services[1].message).to.be.eql('Mocked');
      });
    });

    describe('when error tracker is down', () => {
      it('should show FAILED status', async () => {
        sinonSandbox.stub(ErrorTracker, 'ping').rejects(new Error('Foo'));
        const services = await status2.run();

        expect(services[1].name).to.be.eql('Sentry');
        expect(services[1].status).to.be.eql('FAILED');
        expect(services[1].message).to.be.eql('Error: Foo');
      });
    });
  });
});
