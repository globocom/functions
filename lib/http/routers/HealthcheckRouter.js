/* eslint new-cap: ["error", { "capIsNewExceptions": ["Router"] }] */

const express = require('express');

const router = express.Router();

const log = require('../../support/log');

const Storage = require('../../domain/storage/redis');

const defaultStorage = new Storage();

router.get('/healthcheck', (req, res) => {
  defaultStorage.ping().then(() => {
    res.send('WORKING');
  }, (err) => {
    log.errror(err);
    res.status(500).send('ERR');
  });
});

module.exports = router;
