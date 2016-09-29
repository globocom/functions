const cluster = require('cluster');
const log = require('./support/log');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        log.warn(`worker ${worker.process.pid} died`);
        cluster.fork();
    });
} else {
    let port = parseInt(process.env['PORT'] || '8100');
    let routes = require('./http/routes');

    routes.listen(port, () => {
        log.info(`Functions beating on port ${port}`);
    });
}
