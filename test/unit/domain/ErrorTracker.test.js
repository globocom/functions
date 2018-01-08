const expect = require('chai').expect;

const { EventEmitter } = require('events');

const ErrorTracker = require('../../../lib/domain/ErrorTracker');

class FakeSentryDSN extends EventEmitter {
  constructor() {
    super();
    this.nextEventID = '6701c255-9431-46f4-a59e-eda424742dab';
    this.sent = false;
  }
  generateEventId() {
    return this.nextEventID;
  }

  config(sentryDSN) {
    this.sentryDSN = sentryDSN;
  }

  send(ctx, callback) {
    this.sent = true;
    this.emit('sent', ctx);
    callback(null);
  }
}

describe('ErrorTracker', () => {
  describe('#notify', () => {
    let resultCtx;
    let sentryClient;
    let errTracker;

    before((done) => {
      const err = new Error('testing');
      err.stack = (
        'Error: testing\n' +
        '      at main (testing/testing.js:5:11)\n' +
        '      at <anonymous>'
      );
      const code = `
         function main() {
            const a = 10;
            throw new Error('testing');
         }
     `;
      sentryClient = new FakeSentryDSN();

      errTracker = new ErrorTracker({
        sentryDSN: 'http://my-sentry/project',
        filename: 'testing/testing.js',
        extra: {
          body: {
            a: 'testing',
          },
        },
        tags: {
          codeHash: 'de9a09f1-acf4-41ff-8dda-bfbe4ef627a6',
        },
        code,
        breadcrumbs: [
          {
            data: { status: 200 },
            level: 'info',
            category: 'step',
            message: 'testing/testing.js',
          },
        ],
        sentryClient,
      });

      sentryClient.once('sent', (ctx) => {
        resultCtx = ctx;
        done();
      });

      errTracker.notify(err);
    });

    it('should contains the tags', () => {
      expect(resultCtx.tags).to.be.eql({
        codeHash: 'de9a09f1-acf4-41ff-8dda-bfbe4ef627a6',
      });
    });

    it('should contains modules for sandbox', () => {
      expect(resultCtx.modules).to.have.any.keys('lodash', 'request');
      expect(resultCtx.modules).to.not.have.any.keys('express');
    });

    it('should contains the extra', () => {
      expect(resultCtx.extra).to.be.eql({
        body: { a: 'testing' },
      });
    });

    it('should contains the breadcrumbs', () => {
      expect(resultCtx.breadcrumbs.values).to.be.eql([
        {
          data: { status: 200 },
          level: 'info',
          category: 'step',
          message: 'testing/testing.js',
        },
      ]);
    });

    it('should contains the culprit', () => {
      expect(resultCtx.culprit).to.be.eql('testing/testing.js: testing at main');
    });

    it('should contains the event_id', () => {
      expect(resultCtx.event_id).to.be.eql('6701c255-9431-46f4-a59e-eda424742dab');
    });

    it('should contains the exception', () => {
      expect(resultCtx.exception).to.be.eql([
        {
          stacktrace: {
            frames: [
              {
                colno: 11,
                context_line: "            throw new Error('testing');",
                filename: 'testing/testing.js',
                function: 'main',
                in_app: true,
                lineno: 5,
                module: 'testing',
                post_context: [
                  '         }',
                  '     ',
                ],
                pre_context: [
                  '',
                  '         function main() {',
                  '            const a = 10;',
                ],
              },
            ],
          },
          type: 'Error',
          value: 'testing',
        },
      ]);
    });

    it('should contains the message', () => {
      expect(resultCtx.message).to.be.eql('testing/testing.js: Error: testing');
    });

    describe('when err contains a non error status code', () => {
      before(() => {
        sentryClient.sent = false;

        const err = new Error('Not a critical error');
        err.statusCode = 404;
        errTracker.notify(err);
      });

      it('should ignore error and not send to sentry', () => {
        expect(sentryClient.sent).to.be.false;
      });
    });
  });
});
