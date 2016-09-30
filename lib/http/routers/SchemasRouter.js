/* eslint new-cap: ["error", { "capIsNewExceptions": ["Router"] }] */

const express = require('express');

const router = express.Router();

const schemas = require('../../domain/schemas');

router.get('/*', (req, res) => {
  const name = req.params[0];
  if (schemas[name]) {
    res.json(schemas[name]);
  } else {
    res.status(404).json({ error: 'Schema not found' });
  }
});

module.exports = router;
