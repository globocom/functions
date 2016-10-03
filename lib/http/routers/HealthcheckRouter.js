const Router = require('express').Router;
const log = require('../../support/log');

const router = new Router();


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
