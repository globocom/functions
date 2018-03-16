const Router = require('express').Router;
const bodyParser = require('body-parser');

const functionRunHandler = require('./functionRunHandler');

const router = new Router();
const { bodyParserLimit } = require('../../support/config');


router.all(
  '/:namespace/:id',
  bodyParser.json({ limit: bodyParserLimit }),
  (req, res) => functionRunHandler(req, res, { exposed: true })
);

module.exports = router;
