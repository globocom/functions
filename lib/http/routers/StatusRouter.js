const Router = require('express').Router;
const log = require('../../support/log');
const Status = require('../../domain/status');

const router = new Router();

router.get('/', (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  const status = new Status(memoryStorage);

  status.run().then((output) => {
    res.json({
      services: [output],
    });
  }, (err) => {
    log.error(err);
    res.status(500).json({
      services: [err],
    });
  });
});

module.exports = router;
