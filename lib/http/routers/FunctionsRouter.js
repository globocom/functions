const crypto = require('crypto');

const Router = require('express').Router;
const bodyParser = require('body-parser');
const Validator = require('jsonschema').Validator;

const SchemaResponse = require('../SchemaResponse');
const schemas = require('../../domain/schemas');
const log = require('../../support/log');

const router = new Router();


router.get('/', (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  const page = req.query.page;
  const perPage = req.query.perPage;

  memoryStorage.listNamespaces(page, perPage).then((list) => {
    new SchemaResponse(req, res, 'functions/list')
      .json(list);
  }, (err) => {
    log.error(`Error listing namespaces and its functions: ${err}`);
    res.status(500).json({ error: err.message });
  });
});


router.post('/:namespace/:id', bodyParser.json(), (req, res) => {
  const validationResult = new Validator().validate(req.body, schemas['functions/item']);
  const memoryStorage = req.app.get('memoryStorage');

  if (!validationResult.valid) {
    const error = 'Invalid instance';
    const details = validationResult.errors.map(e => e.toString());

    res.status(400).json({ error, details });
    return;
  }

  const namespace = req.params.namespace;
  const id = req.params.id;
  const code = req.body.code;
  const sandbox = req.app.get('sandbox');

  const invalid = sandbox.testSyntaxError(namespace, id, code);
  if (invalid) {
    log.error(`[${namespace}:${id}] Failed to post code`, `[${namespace}:${id}] ${invalid.error}`);
    res.status(400).json(invalid);
    return;
  }

  const hash = crypto.createHash('sha1').update(code).digest('hex');
  const data = { id, code, hash };

  memoryStorage.postCode(namespace, id, data).then((result) => {
    const codeResult = result[0][1];
    const hashResult = result[1][1];

    // When code and hash are already saved
    // we respond with a 400 - Bad Request
    if (codeResult === 0 || hashResult === 0) {
      res.status(400).json({ error: `The key ${namespace}:${id} already exists` });
      return;
    }

    res.set({ ETag: data.hash });
    new SchemaResponse(req, res, 'functions/item').json(data);
  }, (err) => {
    log.error(`[${namespace}:${id}] ${err}`);
    res.status(500).json({ error: err.message });
  });
});


router.put('/:namespace/:id', bodyParser.json(), (req, res) => {
  const validationResult = new Validator().validate(req.body, schemas['functions/item']);
  const memoryStorage = req.app.get('memoryStorage');

  if (!validationResult.valid) {
    const error = 'Invalid instance';
    const details = validationResult.errors.map(e => e.toString());

    res.status(400).json({ error, details });
    return;
  }

  const namespace = req.params.namespace;
  const id = req.params.id;
  const code = req.body.code;
  const sandbox = req.app.get('sandbox');

  const invalid = sandbox.testSyntaxError(namespace, id, code);
  if (invalid) {
    log.error(`[${namespace}:${id}] Failed to post code`, `[${namespace}:${id}] ${invalid.error}`);
    res.status(400).json(invalid);
    return;
  }

  const hash = crypto.createHash('sha1').update(code).digest('hex');
  const data = { id, code, hash };

  memoryStorage.putCode(namespace, id, data).then(() => {
    res.set({ ETag: data.hash });
    new SchemaResponse(req, res, 'functions/item').json(data);
  }, (err) => {
    log.error(`[${namespace}:${id}] ${err}`);
    res.status(500).json({ error: err.message });
  });
});


router.get('/:namespace/:id', (req, res) => {
  const namespace = req.params.namespace;
  const id = req.params.id;
  const memoryStorage = req.app.get('memoryStorage');

  memoryStorage.getCode(namespace, id).then((code) => {
    if (!code) {
      const error = 'Code not found';
      log.error(`[${namespace}:${id}] Code not found`);
      res.status(404).json({ error });
      return;
    }

    res.set({ ETag: code.hash });
    new SchemaResponse(req, res, 'functions/item').json(code);
  }, (err) => {
    log.error(`[${namespace}:${id}] ${err}`);
    res.status(500).json({ error: err.message });
  });
});


router.delete('/:namespace/:id', (req, res) => {
  const namespace = req.params.namespace;
  const id = req.params.id;
  const memoryStorage = req.app.get('memoryStorage');

  memoryStorage.deleteCode(namespace, id).then(() => {
    res.status(204).end();
  }, (err) => {
    log.error(`[${namespace}:${id}] Failed to delete code id`);
    log.error(`[${namespace}:${id}] ${err}`);
    res.status(500).json({ error: err.message });
  });
});


router.put('/:namespace/:id/run', bodyParser.json(), (req, res) => {
  const namespace = req.params.namespace;
  const id = req.params.id;
  const memoryStorage = req.app.get('memoryStorage');
  const sandbox = req.app.get('sandbox');

  memoryStorage
    .getCodeByCache(namespace, id, {
      preCache: (code) => {
        code.script = sandbox.compileCode(namespace, id, code);
        return code;
      },
    })
    .then((code) => {
      if (!code) {
        const error = `Code '${namespace}/${id}' is not found`;
        log.error(`Code '${namespace}/${id}' is not found`);
        res.status(404).json({ error });
        return null;
      }
      return sandbox.runScript(namespace, id, code.script, req);
    })
    .then((result) => {
      res.set(result.headers);
      res.status(result.status);
      res.send(result.body);
    }, (err) => {
      log.error(`[${namespace}:${id}] Failed to get code from cache`);
      log.error(`[${namespace}:${id}] ${err}`);
      res.status(500).json({ error: err.message });
    });
});


module.exports = router;
