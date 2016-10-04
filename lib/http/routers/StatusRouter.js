const Router = require('express').Router;
const log = require('../../support/log');
const Status = require('../../domain/status');

const router = new Router();

router.get('/', (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  const status = new Status(memoryStorage);

  status.run().then(function (output) {
    if (output.status == 'FAILED') {
      res.status(500);
    }

    res.json({
      services: [output]
    });
  });
});

module.exports = router;
