const Router = require('express').Router;
const bodyParser = require('body-parser');
const Validator = require('jsonschema').Validator;

const schemas = require('../../domain/schemas');
const FunctionsRequest = require('../FunctionsRequest');
const SchemaResponse = require('../SchemaResponse');

const router = new Router();
const { bodyParserLimit } = require('../../support/config');
const log = require('../../support/log');

router.put('/:namespace', bodyParser.json({ limit: bodyParserLimit }), async (req, res, next) => {
  try {
    const validationResult = new Validator().validate(req.body, schemas['namespaces/item']);
    const memoryStorage = req.app.get('memoryStorage');

    if (!validationResult.valid) {
      const error = 'Invalid instance';
      const details = validationResult.errors.map(e => e.toString());

      res.status(400).json({ error, details });
      return;
    }
    const {
    namespace,
  } = req.params;

    const data = Object.assign({}, req.body, { namespace });

    await memoryStorage.putNamespace(namespace, data);

    const functionsRequest = new FunctionsRequest(req);
    new SchemaResponse(functionsRequest, res, 'namespaces/item').json(data);
  } catch (err) {
    log.error(err.message);
    log.error(err.stack);
    res.status(500).json({ error: err.message });
  }
  next();
});

router.get('/:namespace', async (req, res, next) => {
  const {
    namespace,
  } = req.params;
  const memoryStorage = req.app.get('memoryStorage');

  try {
    const obj = await memoryStorage.getNamespace(namespace);
    if (!obj) {
      const error = 'Namespace not found';
      res.status(404).json({ error });
      return;
    }

    const functionsRequest = new FunctionsRequest(req);

    new SchemaResponse(functionsRequest, res, 'namespaces/item').json(obj);
  } catch (err) {
    log.error(err.message);
    log.error(err.stack);
    res.status(500).json({ error: err.message });
  }
  next();
});


router.delete('/:namespace', async (req, res, next) => {
  const namespace = req.params.namespace;
  const memoryStorage = req.app.get('memoryStorage');

  try {
    await memoryStorage.deleteNamespace(namespace);
    res.status(204).end();
  } catch (err) {
    log.error(err.message);
    log.error(err.stack);
    res.status(500).json({ error: err.message });
  }
  next();
});

module.exports = router;
