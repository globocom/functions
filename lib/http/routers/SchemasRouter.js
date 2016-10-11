const Router = require('express').Router;
const schemas = require('../../domain/schemas');
const linkRewriter = require('../../domain/schemas/linkRewriter');

const router = new Router();


router.get('/*', (req, res) => {
  const name = req.params[0];
  if (schemas[name]) {
    const absUrl = `${req.protocol}://${req.get('Host')}`;
    const schema = schemas[name];

    res.json(linkRewriter(absUrl, schema));
  } else {
    res.status(404).json({ error: 'Schema not found' });
  }
});

module.exports = router;
