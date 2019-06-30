const expect = require('chai').expect;
const prometheusClient = require('prom-client');

const Metric = require('../../../lib/domain/Metric');


describe('Metric', () => {
  describe('#observeFunctionRun', () => {
    beforeEach(() => {
      prometheusClient.register.resetMetrics();
    });

    it('should increment metrics in registry', () => {
      new Metric().observeFunctionRun({ namespace: 'xpto', id: 'blah', status: 403 });
      const data = prometheusClient.register.metrics();
      expect(data).to.be.include('backstage_functions_function_run_total{namespace="xpto",id="blah",status="4xx"} 1');
      expect(data).to.be.include('backstage_functions_function_run_duration_seconds_bucket{le="0.05",namespace="xpto",id="blah"} 1');
    });
  });
});
