/* global describe,it,process */
const expect = require('chai').expect;
const loadCertFile = require('../../../lib/support/loadSSLCABundleFile.js');
const https = require('https');
const path = require('path');

describe('CA bundle file Loader', () => {
  beforeEach(() => {
    https.globalAgent.options.ca = [];
    delete process.env.SSL_CERT_FILE;
  });

  it('load the CA bundle file when a environment variable is available', () => {
    process.env.SSL_CERT_FILE = path.join(__dirname, 'cacert.pem');
    expect(https.globalAgent.options.ca).to.have.lengthOf(0);
    loadCertFile();
    expect(https.globalAgent.options.ca).to.have.lengthOf(1);
  });

  it('shouldnt load CA bundle file when a environment variable is not available', () => {
    expect(https.globalAgent.options.ca).to.have.lengthOf(0);
    loadCertFile();
    expect(https.globalAgent.options.ca).to.have.lengthOf(0);
  });
});

