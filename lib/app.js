const cluster = require('cluster');
const log = require('./support/log');
const routes = require('./http/routes');
const config = require('./support/config');

if (cluster.isMaster) {
  // Fork workers.
  for (let i = 0; i < config.numCPUs; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    log.warn(`worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  routes.listen(config.port, () => {
    log.info(`Functions beating on port ${config.port}`);
  });
}
