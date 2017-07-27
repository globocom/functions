/* global describe,it,process */
const expect = require('chai').expect;
const httpConfig = require('../../../lib/support/config').http;
const setupHTTPClient = require('../../../lib/support/setupHTTPClient');
const http = require('http');
const https = require('https');
const path = require('path');

describe('Setup HTTP Client', () => {
  const certFile = path.join(__dirname, 'cacert.pem');

  beforeEach(() => {
    https.globalAgent.options.ca = [];
    httpConfig.keepAlive = false;
    httpConfig.useCertFile = false;
    httpConfig.certFile = undefined;
  });

  it('load the CA bundle file when a environment variable is available', () => {
    httpConfig.useCertFile = true;
    httpConfig.certFile = certFile;

    expect(https.globalAgent.options.ca).to.have.lengthOf(0);
    setupHTTPClient();
    expect(https.globalAgent.options.ca).to.have.lengthOf(1);
  });

  it('should not load CA bundle file whithout use flag', () => {
    httpConfig.certFile = certFile;

    expect(https.globalAgent.options.ca).to.have.lengthOf(0);
    setupHTTPClient();
    expect(https.globalAgent.options.ca).to.have.lengthOf(0);
  });

  it('should not load CA bundle file when a environment variable is not available', () => {
    expect(https.globalAgent.options.ca).to.have.lengthOf(0);
    setupHTTPClient();
    expect(https.globalAgent.options.ca).to.have.lengthOf(0);
  });

  it('should not load CA bundle with flag false', () => {
    httpConfig.useCertFile = false;
    httpConfig.certFile = certFile;

    setupHTTPClient();
    expect(https.globalAgent.options.ca).to.have.lengthOf(0);
  });

  it('let disabled keepAlive when variable is not setted', () => {
    setupHTTPClient();
    expect(http.globalAgent.keepAlive).to.be.false;
    expect(https.globalAgent.keepAlive).to.be.false;
  });

  it('make enabled keepAlive when variable is setted', () => {
    httpConfig.keepAlive = true;
    setupHTTPClient();
    expect(http.globalAgent.keepAlive).to.be.true;
    expect(https.globalAgent.keepAlive).to.be.true;
  });
});
