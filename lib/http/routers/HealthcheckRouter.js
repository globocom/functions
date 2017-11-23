const Router = require('express').Router;
const log = require('../../support/log');

const router = new Router();


router.get('/', async (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  try {
    await memoryStorage.ping();
    res.send('WORKING');
  } catch (err) {
    log.error(err);
    res.status(500).send(`Error: ${err.message}`);
  }
});

module.exports = router;
