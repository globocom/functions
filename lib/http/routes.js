const express = require('express');
const morgan = require('morgan');

const SchemaResponse = require('./SchemaResponse');
const HealthcheckRouter = require('./routers/HealthcheckRouter');
const SchemasRouter = require('./routers/SchemasRouter');
const StatusRouter = require('./routers/StatusRouter');
const FunctionsRouter = require('./routers/FunctionsRouter');
const RedisStorage = require('../domain/storage/redis');
const Sandbox = require('../domain/sandbox').Sandbox;

const app = express();

app.use(morgan('tiny'));
app.disable('x-powered-by');
app.enable('trust proxy');

app.set('memoryStorage', new RedisStorage());
app.set('sandbox', new Sandbox());

app.get('/', (req, res) => {
  new SchemaResponse(req, res, 'root')
    .json({
      name: 'Backstage functions',
    });
});

app.use('/healthcheck', HealthcheckRouter);
app.use('/status', StatusRouter);
app.use('/_schemas', SchemasRouter);
app.use('/functions', FunctionsRouter);


module.exports = app;
