const crypto = require('crypto');

const Router = require('express').Router;
const bodyParser = require('body-parser');
const Validator = require('jsonschema').Validator;
const { PrefixLog } = require('backstage-functions-sandbox');

const log = require('../../support/log');
const schemas = require('../../domain/schemas');
const Pipeline = require('../../domain/Pipeline');
const FunctionsRequest = require('../FunctionsRequest');
const Metric = require('../../domain/Metric');
const SchemaResponse = require('../SchemaResponse');

const router = new Router();


function codeFileName(namespace, codeId) {
  return `${namespace}/${codeId}.js`;
}


function prefix(namespace, codeId) {
  return `namespace:${namespace}, id:${codeId}`;
}

router.get('/', (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  const page = parseInt(req.query.page || '1', 10);
  const perPage = parseInt(req.query.perPage || '10', 10);

  memoryStorage.listNamespaces(page, perPage).then((list) => {
    const functionsRequest = new FunctionsRequest(req);

    new SchemaResponse(functionsRequest, res, 'functions/list')
      .json(list);
  }, (err) => {
    log.error(`Error listing namespaces and its functions: ${err}`);
    res.status(500).json({ error: err.message });
  });
});

router.all('/:namespace/:id*', (req, res, next) => {
  req.log = new PrefixLog(prefix(req.params.namespace, req.params.id));
  next();
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
  const filename = codeFileName(namespace, id);
  const invalid = sandbox.testSyntaxError(filename, code, { prefix: prefix(namespace, id) });

  if (invalid) {
    req.log.error(`Failed to post code: ${invalid.error}`);
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

    const functionsRequest = new FunctionsRequest(req);

    new SchemaResponse(functionsRequest, res, 'functions/item').json(data);
  }, (err) => {
    req.log.error(`${err}`);
    req.log.error(`${err.stack}`);
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
  const filename = codeFileName(namespace, id);
  const sandbox = req.app.get('sandbox');

  const invalid = sandbox.testSyntaxError(filename, code, { prefix: prefix(namespace, id) });
  if (invalid) {
    req.log.error(`Failed to post code: ${invalid.error}`);
    res.status(400).json(invalid);
    return;
  }

  const hash = crypto.createHash('sha1').update(code).digest('hex');
  const data = { id, code, hash };

  memoryStorage.putCode(namespace, id, data).then(() => {
    res.set({ ETag: data.hash });

    const functionsRequest = new FunctionsRequest(req);

    new SchemaResponse(functionsRequest, res, 'functions/item').json(data);
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
      req.log.error(error);
      res.status(404).json({ error });
      return;
    }

    res.set({ ETag: code.hash });

    const functionsRequest = new FunctionsRequest(req);

    new SchemaResponse(functionsRequest, res, 'functions/item').json(code);
  }, (err) => {
    req.log.error(`${err}`);
    req.log.error(`${err.stack}`);
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
    req.log.error(`Failed to delete code id: ${err}`);
    res.status(500).json({ error: err.message });
  });
});


router.put('/:namespace/:id/run', bodyParser.json(), (req, res) => {
  const { namespace, id } = req.params;
  const memoryStorage = req.app.get('memoryStorage');
  const sandbox = req.app.get('sandbox');
  const filename = codeFileName(namespace, id);
  const metric = new Metric('function-run');

  memoryStorage
    .getCodeByCache(namespace, id, {
      preCache: (code) => {
        code.script = sandbox.compileCode(filename, code.code);
        return code;
      },
    })
    .then((code) => {
      if (!code) {
        const error = new Error(`Code '${namespace}/${id}' is not found`);
        error.statusCode = 404;
        throw error;
      }
      return sandbox.runScript(code.script, req, { prefix: prefix(namespace, id) });
    })
    .then((result) => {
      res.set(result.headers);
      res.status(result.status);
      res.send(result.body);
      metric.finish({
        filename,
        status: result.status,
      });
    }, (err) => {
      req.log.error(`Failed to run function: ${err}`);
      req.log.error(err.stack);
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message });

      metric.finish({
        filename,
        status,
        error: err.message,
      });
    });
});


router.put('/pipeline', bodyParser.json(), (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  const sandbox = req.app.get('sandbox');

  let { steps } = req.query;

  if (!steps) {
    res.status(400).json({ error: 'Pass step by querystring is required' });
    return;
  }
  steps = steps.map((step) => {
    const [namespace, id] = step.split('/', 2);
    return { namespace, id };
  });

  memoryStorage
    .getCodesByCache(steps, {
      preCache: (code) => {
        const filename = codeFileName(code.namespace, code.id);
        code.script = sandbox.compileCode(filename, code.code);
        return code;
      },
    })
    .then((codes) => {
      for (let i = 0; i < codes.length; i += 1) {
        if (!codes[i]) {
          const { namespace, id } = steps[i];
          const e = new Error(`Code '${namespace}/${id}' is not found`);
          e.statusCode = 404;
          throw e;
        }
      }

      return new Pipeline(sandbox, req, codes).run();
    })
    .then((result) => {
      res.set(result.headers);
      res.status(result.status);
      res.send(result.body);
    })
    .catch((err) => {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message });
    });
});

module.exports = router;
