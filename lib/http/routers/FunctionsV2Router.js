const Router = require('express').Router;
const bodyParser = require('body-parser');
const Validator = require('jsonschema').Validator;

const log = require('../../support/log');
const schemas = require('../../domain/schemas');
const { StdoutLogStorage } = require('../../domain/LogStorage');
const FunctionsRequest = require('../FunctionsRequest');
const SchemaResponse = require('../SchemaResponse');
const Functions = require('../../domain/Functions');

const router = new Router();
const { bodyParserLimit } = require('../../support/config');

// V2 API
//
//  {version} => semantic version or `latest`
//  `latest` => pointer to most recent version
//
//  - /api/v2/functions/{namespace}/{name} => List versions
//  - /api/v2/functions/{namespace}/{name}/{version}
//  - /api/v2/functions/{namespace}/{name}/{version}/env
//  - /api/v2/functions/{namespace}/{name}/{version}/run
//  - /api/v2/functions/pipeline
//
//  Migration V1 => V2
//   => V1 always access V2 with version `latest`.
//      If not found:
//       - fallback to old key format
//       - migrate the function, initial version 0.0.0, `latest` => 0.0.0
//

router.get('/', async (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  const page = parseInt(req.query.page || '1', 10);
  const perPage = parseInt(req.query.perPage || '10', 10);
  const { namespace, id, version } = req.query;
  const functionsRequest = new FunctionsRequest(req);

  try {
    let list = {};
    if (namespace) {
      list = await memoryStorage.search(namespace, id, version, page, perPage);
    } else {
      list = await memoryStorage.listNamespaces(page, perPage);
    }
    new SchemaResponse(functionsRequest, res, 'functions/list').json(list);
  } catch (err) {
    log.error(`Error listing namespaces and its functions: ${err}`);
    res.status(500).json({ error: err.message });
  }
});

router.all('/:namespace/:id/:version*', (req, res, next) => {
  req.log = new StdoutLogStorage(req.params.namespace, req.params.id, req.params.version).console;
  next();
});

router.put('/:namespace/:id/:version', bodyParser.json({ limit: bodyParserLimit }), async (req, res) => {
  const validationResult = new Validator().validate(req.body, schemas['functions/item']);
  const memoryStorage = req.app.get('memoryStorage');
  const sandbox = req.app.get('sandbox');

  if (!validationResult.valid) {
    const error = 'Invalid instance';
    const details = validationResult.errors.map(e => e.toString());

    res.status(400).json({ error, details });
    return;
  }
  const { namespace, id, version } = req.params;
  const { code, env } = req.body;

  const f = new Functions(memoryStorage, sandbox, req);
  const result = await f.create(namespace, id, version, code, env);

  if (result.status === 200) {
    res.set({ ETag: result.body.hash });

    const functionsRequest = new FunctionsRequest(req);
    new SchemaResponse(functionsRequest, res, 'functions/item').json(result.body);
  } else {
    res.status(result.status);
    res.json(result.body);
  }
});

router.put('/:namespace/:id/:version/env/:env', bodyParser.json({ strict: false, limit: bodyParserLimit }), async (req, res) => {
  const validationResult = new Validator().validate(req.body, schemas['functions/env']);
  const memoryStorage = req.app.get('memoryStorage');

  if (!validationResult.valid) {
    const error = 'Invalid instance';
    const details = validationResult.errors.map(e => e.toString());

    res.status(400).json({ error, details });
    return;
  }

  const { namespace, id, version, env } = req.params;

  try {
    await memoryStorage
      .putCodeEnviromentVariable(namespace, id, version, env, req.body);
    res.status(204).end();
  } catch (err) {
    log.error(`[${namespace}:${id}] Failed to set enviroment variable ${env}, error: ${err}`);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.delete('/:namespace/:id/:version/env/:env', async (req, res) => {
  const { namespace, id, version, env } = req.params;
  const memoryStorage = req.app.get('memoryStorage');

  try {
    await memoryStorage
      .deleteCodeEnviromentVariable(namespace, id, version, env);
    res.status(204).end();
  } catch (err) {
    log.error(`[${namespace}:${id}] Failed to unset enviroment variable ${env}, error: ${err}`);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/:namespace/:id/:version', async (req, res) => {
  const { namespace, id, version } = req.params;
  const memoryStorage = req.app.get('memoryStorage');

  try {
    let v = version;
    const ns = await memoryStorage.getNamespace(namespace);
    if (!ns) {
      v = null;
    } else if (ns.latest && version === 'latest') {
      v = ns.latest[id];
    }

    const code = await memoryStorage.getCode(namespace, id, v);
    if (!code) {
      const error = 'Code not found';
      req.log.error(error);
      res.status(404).json({ error });
      return;
    }

    res.set({ ETag: code.hash });
    const functionsRequest = new FunctionsRequest(req);
    new SchemaResponse(functionsRequest, res, 'functions/item').json(code);
  } catch (err) {
    req.log.error(`${err}`);
    req.log.error(`${err.stack}`);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:namespace/:id/:version', async (req, res) => {
  const { namespace, id, version } = req.params;
  const memoryStorage = req.app.get('memoryStorage');

  try {
    await memoryStorage.deleteCode(namespace, id, version);
    res.status(204).end();
  } catch (err) {
    req.log.error(`Failed to delete code id: ${err}`);
    res.status(500).json({ error: err.message });
  }
});


router.all('/:namespace/:id/:version/run', bodyParser.json({ limit: bodyParserLimit }), async (req, res) => {
  const { namespace, id, version } = req.params;
  const memoryStorage = req.app.get('memoryStorage');
  const sandbox = req.app.get('sandbox');

  const f = new Functions(memoryStorage, sandbox, req);
  const result = await f.run(namespace, id, version);

  if (result.headers) {
    res.set(result.headers);
  }
  res.status(result.status);
  res.json(result.body);
});


router.put('/pipeline', bodyParser.json({ limit: bodyParserLimit }), async (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  const sandbox = req.app.get('sandbox');

  const { steps } = req.query;
  if (!steps) {
    res.status(400).json({ error: 'Step query param is required' });
    return;
  }

  const f = new Functions(memoryStorage, sandbox, req);
  const result = await f.runPipeline(steps);

  if (result.headers) {
    res.set(result.headers);
  }
  res.status(result.status);
  res.json(result.body);
});

module.exports = router;
