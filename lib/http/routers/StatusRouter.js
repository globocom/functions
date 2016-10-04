const Router = require('express').Router;
const Status = require('../../domain/status');

const router = new Router();

router.get('/', (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  const status = new Status(memoryStorage);

  status.run().then((output) => {
    if (output.status === 'FAILED') {
      res.status(500);
    }

    res.json({
      services: [output],
    });
  });
});

module.exports = router;
