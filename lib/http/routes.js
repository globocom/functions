const express = require('express');

const HealthcheckRouter = require('./routers/HealthcheckRouter');
const SchemasRouter = require('./routers/SchemasRouter');
const FunctionsRouter = require('./routers/FunctionsRouter');


const morgan = require('morgan');


const config = require('../support/config');
const RedisStorage = require('../domain/storage/redis');
const SchemaResponse = require('./SchemaResponse');
const Sandbox = require('../domain/sandbox').Sandbox;

const app = express();

app.use(morgan('tiny'));
app.disable('x-powered-by');

app.set('memoryStorage', new RedisStorage());
app.set('sandbox', new Sandbox());

app.get('/', (req, res) => {
  new SchemaResponse(req, res, 'root')
    .json({
      name: 'Backstage functions',
    });
});

app.use('/healthcheck', HealthcheckRouter);
app.use('/_schemas', SchemasRouter);
app.use('/functions', FunctionsRouter);


module.exports = app;
