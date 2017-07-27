const http = require('http');
const https = require('https');
const fs = require('fs');
const log = require('./log');
const httpConfig = require('./config').http;

const setupHTTPClient = () => {
  if (httpConfig.useCertFile) {
    if (httpConfig.certFile !== undefined) {
      https.globalAgent.options.ca = [fs.readFileSync(httpConfig.certFile)];
      log.info('Loaded cert file:', httpConfig.certFile);
    }
  }

  http.globalAgent.keepAlive = httpConfig.keepAlive;
  https.globalAgent.keepAlive = httpConfig.keepAlive;
};

module.exports = setupHTTPClient;
