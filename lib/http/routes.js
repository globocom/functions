const express = require('express');
const vhost = require('vhost');
const morgan = require('morgan');

const Sandbox = require('@globocom/backstage-functions-sandbox');

const SchemaResponse = require('./SchemaResponse');
const HealthcheckRouter = require('./routers/HealthcheckRouter');
const SchemasRouter = require('./routers/SchemasRouter');
const StatusRouter = require('./routers/StatusRouter');
const DebugRouter = require('./routers/DebugRouter');
const NamespacesRouter = require('./routers/NamespacesRouter');
const FunctionsRouter = require('./routers/FunctionsRouter');
const FunctionsPublicRouter = require('./routers/FunctionsPublicRouter');
const RedisStorage = require('../domain/storage/redis');
const parseExposeEnv = require('../support/parseExposeEnv');
const config = require('../support/config');

const FunctionsRequest = require('./FunctionsRequest');

morgan.token('response-sectime', (req, res) => {
  /* eslint no-underscore-dangle: ["error", { "allow": ["_header", "_startAt"] }] */
  if (!res._header || !req._startAt) {
    return '';
  }
  const diff = process.hrtime(req._startAt);
  const secs = diff[0] + (diff[1] * 1e-9);
  return secs.toFixed(3);
});

const memoryStorage = new RedisStorage();
const sandbox = new Sandbox({
  env: parseExposeEnv(),
  globalModules: config.defaultGlobalModules,
  asyncTimeout: config.asyncTimeout,
  syncTimeout: config.syncTimeout,
});

function setupApp(app) {
  app.use(morgan(config.log.morganFormat));
  app.disable('x-powered-by');
  app.enable('trust proxy');
  app.set('memoryStorage', memoryStorage);
  app.set('sandbox', sandbox);
}

const app = express();
setupApp(app);

app.get('/', (req, res) => {
  const backstageRequest = new FunctionsRequest(req);

  new SchemaResponse(backstageRequest, res, 'root')
    .json({
      name: 'Backstage functions',
    });
});

if (config.exposed.host) {
  const publicApp = express();
  setupApp(publicApp);
  publicApp.use(FunctionsPublicRouter);
  publicApp.use((req, res) => {
    res.send({ error: 'Not found' });
  });

  app.use(vhost(config.exposed.host, publicApp));
}

app.use('/healthcheck', HealthcheckRouter);
app.use('/status', StatusRouter);
app.use('/_debug', DebugRouter);
app.use('/_schemas', SchemasRouter);
app.use('/functions', FunctionsRouter);
app.use('/namespaces', NamespacesRouter);


module.exports = app;
