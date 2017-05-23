const https = require('https');
const fs = require('fs');
const log = require('./log');

module.exports = () => {
  const ca = process.env.SSL_CERT_FILE;
  if (ca !== undefined) {
    https.globalAgent.options.ca = [];
    https.globalAgent.options.ca.push(fs.readFileSync(ca));
    log.info('Loading cert file.');
  }
};
