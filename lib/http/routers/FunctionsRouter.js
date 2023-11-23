const crypto = require('crypto');

const Router = require('express').Router;
const bodyParser = require('body-parser');
const Validator = require('jsonschema').Validator;

const log = require('../../support/log');
const schemas = require('../../domain/schemas');
const Pipeline = require('../../domain/Pipeline');
const ErrorTracker = require('../../domain/ErrorTracker');
const { StdoutLogStorage, DefaultLogStorage } = require('../../domain/LogStorage');
const FunctionsRequest = require('../FunctionsRequest');
const Metric = require('../../domain/Metric');
const SpanConsoleWrapper = require('../../domain/SpanConsoleWrapper');
const SchemaResponse = require('../SchemaResponse');

const router = new Router();
const { bodyParserLimit } = require('../../support/config');
const { reportError } = require('../../support/tracing');
const { RecordOtelError } = require('../../support/opentelemetry')

function codeFileName(namespace, codeId) {
  return `${namespace}/${codeId}.js`;
}

router.get('/', async (req, res, next) => {
  const memoryStorage = req.app.get('memoryStorage');
  const page = parseInt(req.query.page || '1', 10);
  const perPage = parseInt(req.query.perPage || '10', 10);
  const { namespace, id } = req.query;
  const functionsRequest = new FunctionsRequest(req);

  try {
    let list = {};
    if (namespace) {
      list = await memoryStorage.search(namespace, id, page, perPage);
    } else {
      list = await memoryStorage.listNamespaces(page, perPage);
    }
    new SchemaResponse(functionsRequest, res, 'functions/list').json(list);
  } catch (err) {
    log.error(`Error listing namespaces and its functions: ${err}`);
    res.status(500).json({ error: err.message });
  }
  next();
});

router.all('/:namespace/:id*', (req, res, next) => {
  req.log = new StdoutLogStorage(req.params.namespace, req.params.id).console;
  next();
});

router.put('/:namespace/:id', bodyParser.json({ limit: bodyParserLimit }), async (req, res, next) => {
  const functionProvider = req.headers['x-bs-function-provider']
  const isExternalFunctionProvider = !functionProvider || functionProvider != "sandbox"

  const validationResult = new Validator().validate(req.body, schemas['functions/item']);
  const memoryStorage = req.app.get('memoryStorage');
  const metric = new Metric('function-update');

  if (!validationResult.valid) {
    const error = 'Invalid instance';
    const details = validationResult.errors.map(e => e.toString());

    metric.observeFunctionUpdate(400);
    res.status(400).json({ error, details });
    return;
  }
  const {
    namespace,
    id,
  } = req.params;
  const {
    code,
    env,
  } = req.body;
  const filename = codeFileName(namespace, id);
  const sandbox = req.app.get('sandbox');

  if(!isExternalFunctionProvider){
    const invalid = sandbox.testSyntaxError(filename, code, {
      console: new StdoutLogStorage(namespace, id).console,
    });
    if (invalid) {
      req.log.error(`Failed to post code: ${invalid.error}`);
      metric.observeFunctionUpdate(400);
      res.status(400).json(invalid);
      return;
    }
  }

  const hash = crypto.createHash('sha1').update(code).digest('hex');
  const data = { id, code, hash, provider: functionProvider };

  if (env) {
    data.env = env;
  }

  try {
    await memoryStorage.putCode(namespace, id, data);
    res.set({ ETag: data.hash });

    const functionsRequest = new FunctionsRequest(req);
    metric.observeFunctionUpdate(200);
    new SchemaResponse(functionsRequest, res, 'functions/item').json(data);
  } catch (err) {
    log.error(`[${namespace}:${id}] ${err}`);
    metric.observeFunctionUpdate(500);
    res.status(500).json({ error: err.message });
  }

  next();
});

router.put('/:namespace/:id/env/:env', bodyParser.json({ strict: false, limit: bodyParserLimit }), async (req, res, next) => {
  const validationResult = new Validator().validate(req.body, schemas['functions/env']);
  const memoryStorage = req.app.get('memoryStorage');

  if (!validationResult.valid) {
    const error = 'Invalid instance';
    const details = validationResult.errors.map(e => e.toString());

    res.status(400).json({ error, details });
    return;
  }

  const {
    namespace,
    id,
    env,
  } = req.params;

  try {
    await memoryStorage
      .putCodeEnviromentVariable(namespace, id, env, req.body);
    res.status(204).end();
  } catch (err) {
    log.error(`[${namespace}:${id}] Failed to set enviroment variable ${env}, error: ${err}`);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
  next();
});

router.delete('/:namespace/:id/env/:env', async (req, res, next) => {
  const {
    namespace,
    id,
    env,
  } = req.params;
  const memoryStorage = req.app.get('memoryStorage');

  try {
    await memoryStorage
      .deleteCodeEnviromentVariable(namespace, id, env);
    res.status(204).end();
  } catch (err) {
    log.error(`[${namespace}:${id}] Failed to unset enviroment variable ${env}, error: ${err}`);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
  next();
});

router.get('/:namespace/:id', async (req, res, next) => {
  const {
    namespace,
    id,
  } = req.params;
  const memoryStorage = req.app.get('memoryStorage');

  const functionProvider = req.headers['x-bs-function-provider']
  const isExternalFunctionProvider = !functionProvider || functionProvider != "sandbox"

  try {
    const code = await memoryStorage.getCode(namespace, id);
    if (!code) {
      const error = 'Code not found';
      req.log.error(error);
      res.status(404).json({ error });
      return;
    }

    if(!isExternalFunctionProvider){
      res.set({ ETag: code.hash });
    }

    const functionsRequest = new FunctionsRequest(req);

    new SchemaResponse(functionsRequest, res, 'functions/item').json(code);
  } catch (err) {
    req.log.error(`${err}`);
    req.log.error(`${err.stack}`);
    res.status(500).json({ error: err.message });
  }
  next();
});

router.delete('/:namespace/:id', async (req, res, next) => {
  const namespace = req.params.namespace;
  const id = req.params.id;
  const memoryStorage = req.app.get('memoryStorage');

  try {
    await memoryStorage.deleteCode(namespace, id);
    res.status(204).end();
  } catch (err) {
    req.log.error(`Failed to delete code id: ${err}`);
    res.status(500).json({ error: err.message });
  }
  next();
});


router.all('/:namespace/:id/run', bodyParser.json({ limit: bodyParserLimit }), async (req, res, next) => {
  const { namespace, id } = req.params;
  const memoryStorage = req.app.get('memoryStorage');
  const sandbox = req.app.get('sandbox');
  const filename = codeFileName(namespace, id);
  const metric = new Metric('function-run');
  const logStorage = new DefaultLogStorage(namespace, id, req);

  const span = req.span.tracer().startSpan('run function', {
    childOf: req.span,
    tags: {
      'function.namespace': namespace,
      'function.id': id,
    },
  });
  let code;

  try {
    code = await memoryStorage.getCodeByCache(namespace, id, {
      preCache: (preCode) => {
        preCode.script = sandbox.compileCode(filename, preCode.code);
        return preCode;
      },
    });

    if (!code) {
      const error = new Error(`Code '${namespace}/${id}' is not found`);
      error.statusCode = 404;
      reportError(span, error);
      throw error;
    }
  } catch (err) {
    reportError(span, err);
    res.status(err.statusCode || 500).json({ error: err.message });
    return;
  }

  try {
    metric.observeFunctionSetup();
    const options = {
      console: new SpanConsoleWrapper(logStorage.console, span),
      env: code.env,
      span,
    };
    const result = await sandbox.runScript(code.script, req, options);

    res.set(result.headers);
    res.status(result.status);
    res.json(result.body);
    span.finish();

    const spent = metric.observeFunctionRun({ namespace, id, status: result.status });

    logStorage.flush({
      status: result.status,
      requestTime: spent,
    });
  } catch (err) {
    logStorage.console.error(`Failed to run function: ${err}`);
    logStorage.console.error(err.stack);
    reportError(span, err);

    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });

    const spent = metric.observeFunctionRun({ namespace, id, status });

    const logResult = logStorage.flush({
      status,
      requestTime: spent,
    });

    const { sentryDSN } = code;

    const extra = Object.assign({ body: req.body }, logResult || {});
    const errTracker = new ErrorTracker({
      sentryDSN,
      filename,
      extra,
      tags: { codeHash: code.hash },
      code: code.code,
    });
    errTracker.notify(err);
    RecordOtelError(err)
  }
});


router.put('/pipeline', bodyParser.json({ limit: bodyParserLimit }), async (req, res, next) => {
  const memoryStorage = req.app.get('memoryStorage');
  const sandbox = req.app.get('sandbox');

  let { steps } = req.query;

  const span = req.span.tracer().startSpan('run pipeline', {
    childOf: req.span,
    tags: {
      'function.steps': Array.isArray(steps) ? steps.join(', ') : '',
    },
  });

  if (!steps) {
    const err = new Error('Pass step by querystring is required');
    reportError(span, err);
    res.status(400).json({ error: err.message });
    return;
  }
  steps = steps.map((step) => {
    const [namespace, id] = step.split('/', 2);
    return { namespace, id };
  });

  const metric = new Metric('pipeline-run');

  try {
    const codes = await memoryStorage.getCodesByCache(steps, {
      preCache: (code) => {
        const filename = codeFileName(code.namespace, code.id);
        code.script = sandbox.compileCode(filename, code.code);
        return code;
      },
    });

    for (let i = 0; i < codes.length; i += 1) {
      if (!codes[i]) {
        const { namespace, id } = steps[i];
        const e = new Error(`Code '${namespace}/${id}' is not found`);
        e.statusCode = 404;
        reportError(span, e);
        throw e;
      }
    }

    const result = await new Pipeline(sandbox, req, codes, span).run();

    res.set(result.headers);
    res.status(result.status);
    span.finish();
    metric.observePipelineRun(result.status);
    res.json(result.body);
  } catch (err) {
    reportError(span, err);
    RecordOtelError(err)
    const status = err.statusCode || 500;
    metric.observePipelineRun(status);
    res.status(status).json({ error: err.message });
  }
  next();
});

module.exports = router;
