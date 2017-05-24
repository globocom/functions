const https = require('https');
const fs = require('fs');
const log = require('./log');

const useSSLCertFile = () => {
  const useSSL = process.env.FUNCTIONS_USE_SSL_CERT_FILE;
  return useSSL === 'true';
};

const loadSSLCABundleFile = () => {
  if (useSSLCertFile()) {
    const ca = process.env.SSL_CERT_FILE;

    if (ca !== undefined) {
      https.globalAgent.options.ca = [fs.readFileSync(ca)];
      log.info('Loading cert file.');
    }
  }
};

module.exports = loadSSLCABundleFile;
