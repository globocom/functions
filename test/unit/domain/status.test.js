/* eslint class-methods-use-this: ["error", { "exceptMethods": ["ping"] }] */

const expect = require('chai').expect;
const Status = require('../../../lib/domain/status');
const Storage = require('../../../lib/domain/storage');

class WorkingStorage extends Storage {
  constructor(name = 'TestStorage') {
    super(name);
  }

  ping() {
    return new Promise((accept) => {
      accept('OK');
    });
  }
}

class NotWorkingStorage extends Storage {
  constructor(name = 'TestStorage') {
    super(name);
  }

  ping() {
    return new Promise((accept, reject) => {
      reject(new Error('Not working'));
    });
  }
}


describe('Status', () => {
  describe('run', () => {
    const status1 = new Status(new WorkingStorage());
    const status2 = new Status(new NotWorkingStorage());
    const properties = ['name', 'status', 'message', 'time'];

    it('should contain mandatory properties on response', (done) => {
      Promise.all([
        status1.run(),
        status2.run(),
      ]).then(([output1, output2]) => {
        expect(output1).to.include.keys(properties);
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
        status2.run().then((output) => {
          expect(output.status).to.eq('FAILED');
          done();
        });
      });
    });
  });
});
