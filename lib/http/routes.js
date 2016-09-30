const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const crypto = require('crypto');

const Validator = require('jsonschema').Validator;

const schemas = require('../domain/schemas');
const log = require('../support/log');
const config = require('../support/config');
const Storage = require('../domain/storage/redis');
const Sandbox = require('../domain/sandbox').Sandbox;
const SchemaResponse = require('./SchemaResponse');

const defaultSandbox = new Sandbox();
const defaultStorage = new Storage();
const routes = express();

routes.use(morgan('tiny'));
routes.disable('x-powered-by');

routes.get('/', (req, res) => {
  new SchemaResponse(req, res, 'root')
    .json({
      name: 'Backstage functions',
      commit: config.commit,
    });
});

routes.get('/functions', (req, res) => {
  new SchemaResponse(req, res, 'functions/list')
    .json({
      items: [],
      warning: 'List is not implemented yet man!',
    });
});

routes.put('/functions/:namespace/:id', bodyParser.json(), (req, res) => {
  const validationResult = new Validator().validate(req.body, schemas['functions/item']);

  if (!validationResult.valid) {
    const error = 'Invalid instance';
    const details = validationResult.errors.map(e => e.toString());

    res.status(400).json({ error, details });
    return;
  }

  const namespace = req.params.namespace;
  const id = req.params.id;
  const code = req.body.code;

  const invalid = defaultSandbox.testSyntaxError(namespace, id, code);
  if (invalid) {
    log.error('Failed to post code, code id:', id, 'error: ', invalid.error);
    res.status(400).json(invalid);
    return;
  }

  const hash = crypto.createHash('sha1').update(code).digest('hex');
  const data = { id, code, hash };

  defaultStorage.putCode(namespace, id, data).then(() => {
    res.set({ ETag: data.hash });
    new SchemaResponse(req, res, 'code').json(data);
  }, (err) => {
    log.error(err);
    res.status(500).json({ error: err.message });
  });
});

routes.get('/functions/:namespace/:id', (req, res) => {
  defaultStorage.getCode(req.params.namespace, req.params.id).then((code) => {
    if (!code) {
      const error = 'Code not found';
      res.status(404).json({ error });
      return;
    }

    res.set({ ETag: code.hash });
    new SchemaResponse(req, res, 'code').json(code);
  }, (err) => {
    log.error(err);
    res.status(500).json({ error: err.message });
  });
});

routes.delete('/functions/:namespace/:id', (req, res) => {
  defaultStorage.deleteCode(req.params.namespace, req.params.id).then(() => {
    res.status(204).end();
  }, (err) => {
    log.error('Failed to delete code id', req.params.id);
    log.error(err);
    res.status(500).json({ error: err.message });
  });
});

routes.get('/healthcheck', (req, res) => {
  defaultStorage.ping().then(() => {
    res.send('WORKING');
  }, (err) => {
    log.errror(err);
    res.status(500).send('ERR');
  });
});

routes.get('/_schemas/*', (req, res) => {
  const name = req.params[0];
  if (schemas[name]) {
    res.json(schemas[name]);
  } else {
    res.status(404).json({ error: 'Schema not found' });
  }
});

routes.put('/functions/:namespace/:id/run', bodyParser.json(), (req, res) => {
  const namespace = req.params.namespace;
  const id = req.params.id;

  defaultStorage
    .getCodeByCache(namespace, id, {
      preCache: (code) => {
        code.script = defaultSandbox.compileCode(namespace, id, code);
        return code;
      },
    })
    .then((code) => {
      if (!code) {
        throw new Error(`Code '${namespace}/${id}' not is found`);
      }
      return defaultSandbox.runScript(namespace, id, code.script, req.body.args);
    })
    .then((result) => {
      res.json({ result });
    }, (err) => {
      log.error('Failed to get code from cache');
      log.error(err);
      res.status(500).json({ error: err.message });
    });
});

module.exports = routes;
