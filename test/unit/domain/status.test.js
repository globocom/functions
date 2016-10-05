const expect = require('chai').expect;
const Status = require('../../../lib/domain/status');
const NotWorkingStorage = require('../../fakes/NotWorkingStorage');
const WorkingStorage = require('../../fakes/WorkingStorage');

describe('Status', () => {
  describe('run', () => {
    const status1 = new Status(new WorkingStorage());
    const status2 = new Status(new NotWorkingStorage());
    const properties = ['name', 'status', 'message', 'time'];

    it('should contain mandatory properties on response', (done) => {
      status1.run().then((output1) => {
        expect(output1).to.include.keys(properties);
        return status2.run();
      }).catch((output2) => {
        expect(output2).to.include.keys(properties);
        done();
      });
    });

    describe('when service is up', () => {
      it('should show WORKING status', (done) => {
        status1.run().then((output) => {
          expect(output.status).to.eq('WORKING');
          done();
        });
      });
    });

    describe('when service is down', () => {
      it('should show FAILED status', (done) => {
        status2.run().catch((output) => {
          expect(output.status).to.eq('FAILED');
          done();
        });
      });
    });
  });
});
