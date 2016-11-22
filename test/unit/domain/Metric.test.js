const dgram = require('dgram');
const expect = require('chai').expect;
const sinon = require('sinon');

const config = require('../../../lib/support/config');
const Metric = require('../../../lib/domain/Metric');


describe('Metric', () => {
  let sandbox;
  let onMessage;

  before((done) => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(config.metric, 'client', 'functions-test');
    sandbox.stub(config.metric, 'udpHost', 'localhost');


    const server = dgram.createSocket('udp4');

    server.on('error', (err) => {
      done(err);
      server.close();
    });

    server.on('message', (msg) => {
      onMessage(msg);
    });

    server.on('listening', () => {
      sandbox.stub(config.metric, 'udpPort', server.address().port);
      done();
    });

    server.bind(0);
  });

  after(() => {
    sandbox.restore();
  });

  it('should send metric by udp', (done) => {
    const metric = new Metric('test-metric');
    metric.finish({
      test: 'testing',
    });

    onMessage = (msg) => {
      const data = JSON.parse(msg);
      expect(data.client).to.be.eql('functions-test');
      expect(data.metric).to.be.eql('test-metric');
      expect(data.time).to.be.below(5);
      expect(data.test).to.be.eql('testing');
      done();
    };
  });
});
