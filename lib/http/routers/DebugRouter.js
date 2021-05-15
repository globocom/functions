const Router = require('express').Router;
const http = require('http');
const https = require('https');


const router = new Router();

function socketStats(sockets) {
  return Object.keys(sockets).map(host => ({
    host,
    count: sockets[host].length,
  }));
}

router.get('/http_stats', (req, res, next) => {
  res.json({
    http: {
      sockets: socketStats(http.globalAgent.sockets),
      freeSockets: socketStats(http.globalAgent.freeSockets),
    },
    https: {
      sockets: socketStats(https.globalAgent.sockets),
      freeSockets: socketStats(https.globalAgent.freeSockets),
    },
  });
  next()
});

module.exports = router;
