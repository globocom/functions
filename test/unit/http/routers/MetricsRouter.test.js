const request = require('supertest');
const express = require('express');
const sinon = require('sinon');

const prometheusClient = require('prom-client');

const expect = require('chai').expect;
const MetricsRouter = require('../../../../lib/http/routers/MetricsRouter');

describe('GET /metrics', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(prometheusClient.AggregatorRegistry.prototype, 'clusterMetrics').yields(null, 'my_metric_total 1');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should returns OK text string', (done) => {
    const app = express();
    app.use('/metrics', MetricsRouter);

    request(app)
      .get('/metrics')
      .expect((res) => {
        expect(res.text).to.be.eql('my_metric_total 1');
      })
      .end((err) => {
        if (err) {
          done(err);
        } else {
          done();
        }
      });
  });
});
