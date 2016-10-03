/* eslint new-cap: ["error", { "capIsNewExceptions": ["Router"] }] */

const express = require('express');

const router = express.Router();

const log = require('../../support/log');

router.get('/', (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  memoryStorage.ping().then(() => {
    res.send('WORKING');
  }, (err) => {
    log.error(err);
    res.status(500).send(`ERROR: ${err.message}`);
  });
});

module.exports = router;
