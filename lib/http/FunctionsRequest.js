function extractHost() {
  let host = this.req.get('Host');

  const xForwardedHost = this.req.get('x-forwarded-host');
  if (xForwardedHost) {
    host = xForwardedHost;
  }
  return host;
}

class FunctionsRequest {
  constructor(req) {
    this.req = req;
  }

  schemeAndAuthority() {
    // identifying host until expressjs 5.x `req.host` be released
    const host = extractHost.call(this);
    return `${this.req.protocol}://${host}`;
  }
}

module.exports = FunctionsRequest;
