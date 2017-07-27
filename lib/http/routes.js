const express = require('express');
const morgan = require('morgan');

const Sandbox = require('backstage-functions-sandbox');

const SchemaResponse = require('./SchemaResponse');
const HealthcheckRouter = require('./routers/HealthcheckRouter');
const SchemasRouter = require('./routers/SchemasRouter');
const StatusRouter = require('./routers/StatusRouter');
const DebugRouter = require('./routers/DebugRouter');
const FunctionsRouter = require('./routers/FunctionsRouter');
const RedisStorage = require('../domain/storage/redis');
const parseExposeEnv = require('../support/parseExposeEnv');
const config = require('../support/config');

const FunctionsRequest = require('./FunctionsRequest');

const app = express();

app.use(morgan('tiny'));
app.disable('x-powered-by');
app.enable('trust proxy');

app.set('memoryStorage', new RedisStorage());
app.set('sandbox', new Sandbox({
  env: parseExposeEnv(),
  globalModules: config.defaultGlobalModules,
  asyncTimeout: config.asyncTimeout,
  syncTimeout: config.syncTimeout,
}));

app.get('/', (req, res) => {
  const backstageRequest = new FunctionsRequest(req);

  new SchemaResponse(backstageRequest, res, 'root')
    .json({
      name: 'Backstage functions',
    });
});

app.use('/healthcheck', HealthcheckRouter);
app.use('/status', StatusRouter);
app.use('/_debug', DebugRouter);
app.use('/_schemas', SchemasRouter);
app.use('/functions', FunctionsRouter);


module.exports = app;
