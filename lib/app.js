const cluster = require('cluster');
const express = require('express');
const log = require('./support/log');
const routes = require('./http/routes');
const MetricsRouter = require('./http/routers/MetricsRouter');
const config = require('./support/config');
const globalImport = require('./support/globalImport');
const setupHTTPClient = require('./support/setupHTTPClient');

if (cluster.isMaster && config.useNodeCluster) {
  const metricsApp = express();
  metricsApp.use('/metrics', MetricsRouter);
  metricsApp.listen(config.metricsPort, () => {
    log.info(`Functions metrics is beating on port ${config.metricsPort}`);
  });

  // Fork workers.
  for (let i = 0; i < config.numCPUs; i += 1) {
    cluster.fork();
  }

  cluster.on('disconnect', (worker) => {
    log.warn(`worker ${worker.process.pid} disconnected`);
    worker.hasForked = true;
    cluster.fork();
  });

  cluster.on('exit', (worker) => {
    log.warn(`worker ${worker.process.pid} died`);
    if (!worker.exitedAfterDisconnect && !worker.hasForked) {
      cluster.fork();
    }
  });
} else {
  globalImport(); // Makes sure to load some support libraries to run the functions
  setupHTTPClient();
  routes.listen(config.port, () => {
    log.info(`Functions beating on port ${config.port}`);
  });
}
