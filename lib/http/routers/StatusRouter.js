const Router = require('express').Router;
const log = require('../../support/log');
const Status = require('../../domain/status');

const router = new Router();

router.get('/', async (req, res) => {
  const memoryStorage = req.app.get('memoryStorage');
  const services = await new Status(memoryStorage).run();
  const failedServices = services.filter(s => s.status !== 'WORKING');

  let statusCode = 200;

  for (const failedService of failedServices) {
    statusCode = 500;
    log.error(failedService.message);
  }

  res.status(statusCode).json({ services });
});

module.exports = router;
