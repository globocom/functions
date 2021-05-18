const Router = require('express').Router;
const schemas = require('../../domain/schemas');
const linkRewriter = require('../../domain/schemas/linkRewriter');
const FunctionsRequest = require('../FunctionsRequest');

const router = new Router();


router.get('/*', (req, res, next) => {
  const name = req.params[0];
  if (schemas[name]) {
    const schema = schemas[name];
    const schemeAndAuthority = new FunctionsRequest(req).schemeAndAuthority();

    res.json(linkRewriter(schemeAndAuthority, schema));
  } else {
    res.status(404).json({ error: 'Schema not found' });
  }
  next();
});

module.exports = router;
