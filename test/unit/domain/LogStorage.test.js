const expect = require('chai').expect;
const sinon = require('sinon');

const { MemoryStream } = require('@globocom/backstage-functions-sandbox');
const {
  StdoutLogStorage,
  GelfLogStorage,
} = require('../../../lib/domain/LogStorage');

const config = require('../../../lib/support/config');
const Graygelf = require('../../GelfServer');

describe('StdoutLogStorage', () => {
  /* eslint no-underscore-dangle: ["error", { "allow": ["_stdout", "_stderr"] }] */

  const logStorage = new StdoutLogStorage('test-namespace', 'test-id');

  it('should create prefixed stdout console', () => {
    const stdout = logStorage.console._stdout;
    expect(stdout.prefix).to.be.eql('info: [namespace:test-namespace, id:test-id]');
    expect(stdout.buf).to.be.eql(process.stdout);
  });

  it('should create prefixed stderr console', () => {
    const stderr = logStorage.console._stderr;
    expect(stderr.prefix).to.be.eql('error: [namespace:test-namespace, id:test-id]');
    expect(stderr.buf).to.be.eql(process.stderr);
  });
});

describe('GelfLogStorage', () => {
  /* eslint no-underscore-dangle: ["error", { "allow": [
         "_stdout", "_stderr", "_status", "_request_time", "_group", "_file",
         "_rid", "_clientId"
  ] }] */

  const req = {
    headers: {
      'x-rid': 'my-rid',
      'x-client-id': 'my-client-id',
    },
  };

  let gelfServer;
  let sandbox;
  let logStorage;
  let newLogStorage;

  before(() => {
    gelfServer = new Graygelf();
    gelfServer.listen();

    sandbox = sinon.sandbox.create();
    sandbox.stub(config.log, 'fieldsFromHTTPHeaders').value({
      rid: 'x-rid',
      clientId: 'x-client-id',
    });

    logStorage = new GelfLogStorage('test-namespace', 'test-id', req);
  });

  after(() => {
    gelfServer.close();
    sandbox.restore();
  });

  it('should create prefixed stdout console', () => {
    const stdout = logStorage.console._stdout;
    expect(stdout.prefix).to.be.eql('info:');
    expect(stdout.buf).to.be.an.instanceof(MemoryStream);
  });

  it('should create prefixed stdout console', () => {
    const stderr = logStorage.console._stderr;
    expect(stderr.prefix).to.be.eql('error:');
    expect(stderr.buf).to.be.an.instanceof(MemoryStream);
  });

  describe('when has more than one host in config.log.hosts', () => {
    before(() => {
      config.log.hosts = ['localhost', '127.0.0.1'];
      newLogStorage = new GelfLogStorage('test-namespace', 'test-id', req);
    });

    after(() => {
      config.log.hosts = 'localhost';
    });

    it('should be different gelfClients', () => {
      const client1 = newLogStorage.gelfClients[0].config.graylogHostname;
      const client2 = newLogStorage.gelfClients[1].config.graylogHostname;

      expect(client1 === client2).to.be.false;
      expect(newLogStorage.gelfClients[0] === newLogStorage.gelfClients[1]).to.be.false;
    });

    it('should have a gelfClients property in GelfLogStorage', () => {
      expect(newLogStorage).to.have.property('gelfClients');
    });

    it('should initialize more than one gelfClient', () => {
      expect(newLogStorage.gelfClients.length).to.be.eql(2);
    });
  });

  describe('#flush', () => {
    let receivedMsg;

    describe('when status <= 400', () => {
      before((done) => {
        logStorage.console.info('it is my info');
        logStorage.console.error('it is my error');

        gelfServer.once('message', (msg) => {
          receivedMsg = msg;
          done();
        });

        logStorage.flush({
          status: 200,
          requestTime: 20,
        });
      });

      it('should receive short_message attribute', () => {
        expect(receivedMsg.short_message).to.be.eql(
          'Function "test-namespace/test-id.js" was executed with status 200 "OK"'
        );
      });

      it('should receive full_message attribute', () => {
        expect(receivedMsg.full_message).to.be.eql(
          'info: it is my info\n' +
            'error: it is my error\n'
        );
      });

      it('should receive full_message attribute', () => {
        expect(receivedMsg._status).to.be.eql(200);
      });

      it('should receive request_time attribute', () => {
        expect(receivedMsg._request_time).to.be.eql(20);
      });

      it('should receive group attribute', () => {
        expect(receivedMsg._group).to.be.eql('test-namespace');
      });

      it('should receive file attribute', () => {
        expect(receivedMsg._file).to.be.eql('test-namespace/test-id.js');
      });

      it('should receive rid attribute extracted from HTTP header setting', () => {
        expect(receivedMsg._rid).to.be.eql('my-rid');
      });

      it('should receive clientId attribute extracted from HTTP header setting', () => {
        expect(receivedMsg._clientId).to.be.eql('my-client-id');
      });

      it('should receive level attribute', () => {
        expect(receivedMsg.level).to.be.eql(6);
      });
    });

    describe('when status <= 500', () => {
      before((done) => {
        logStorage.console.info('it is my info');
        logStorage.console.error('it is my error');

        gelfServer.once('message', (msg) => {
          receivedMsg = msg;
          done();
        });

        logStorage.flush({
          status: 422,
          requestTime: 20,
        });
      });

      it('should receive level attribute', () => {
        expect(receivedMsg.level).to.be.eql(4);
      });
    });

    describe('when status >= 500', () => {
      before((done) => {
        logStorage.console.info('it is my info');
        logStorage.console.error('it is my error');

        gelfServer.once('message', (msg) => {
          receivedMsg = msg;
          done();
        });

        logStorage.flush({
          status: 500,
          requestTime: 20,
        });
      });

      it('should receive level attribute', () => {
        expect(receivedMsg.level).to.be.eql(3);
      });
    });

    describe('when exist a console overflow', () => {
      before((done) => {
        for (let i = 0; i < 1000; i += 1) {
          logStorage.console.info(`line ${i}`);
        }

        gelfServer.once('message', (msg) => {
          receivedMsg = msg;
          done();
        });

        logStorage.flush({
          status: 500,
          requestTime: 20,
        });
      });

      it('should truncate the `full_message` attribute', () => {
        expect(receivedMsg.full_message.length).to.be.eql(3010);
        expect(receivedMsg.full_message.endsWith('\ntruncated')).to.be.true;
      });
    });
  });
});
