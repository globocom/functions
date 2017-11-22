const expect = require('chai').expect;
const Status = require('../../../lib/domain/status');
const NotWorkingStorage = require('../../fakes/NotWorkingStorage');
const WorkingStorage = require('../../fakes/WorkingStorage');

describe('Status', () => {
  describe('run', () => {
    const status1 = new Status(new WorkingStorage());
    const status2 = new Status(new NotWorkingStorage());
    const properties = ['name', 'status', 'message', 'time'];

    it('should contain mandatory properties on response', async () => {
      const output1 = await status1.run();
      const output2 = await status2.run();

      expect(output1).to.include.keys(properties);
      expect(output2).to.include.keys(properties);
    });

    describe('when service is up', () => {
      it('should show WORKING status', async () => {
        const output = await status1.run();
        expect(output.status).to.eq('WORKING');
      });
    });

    describe('when service is down', () => {
      it('should show FAILED status', async () => {
        const output = await status2.run();
        expect(output.status).to.eq('FAILED');
      });
    });
  });
});
