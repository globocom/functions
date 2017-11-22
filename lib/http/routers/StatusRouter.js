const Router = require('express').Router;
const log = require('../../support/log');
const Status = require('../../domain/status');

const router = new Router();

router.get('/', async (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  const status = new Status(memoryStorage);
  const output = await status.run();
  const statusCode = output.status === 'WORKING' ? 200 : 500;

  if (statusCode === 500) {
    log.error(output.message);
  }
  res.status(statusCode).json({
    services: [output],
  });
});

module.exports = router;
