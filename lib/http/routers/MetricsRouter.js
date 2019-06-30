const Router = require('express').Router;
const prometheusClient = require('prom-client');
const log = require('../../support/log');

const router = new Router();
const aggregatorRegistry = new prometheusClient.AggregatorRegistry();

router.get('/', (req, res) => {
  aggregatorRegistry.clusterMetrics((err, metrics) => {
    if (err) {
      log.error(err);
      res.send(`Error: ${err}`);
      res.status(500);
      return;
    }
    res.set('Content-Type', aggregatorRegistry.contentType);
    res.send(metrics);
  });
});

module.exports = router;
