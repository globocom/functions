
class SandboxResponse {
  constructor({ callback }) {
    this.callback = callback;
    this.statusCode = 200;
    this.headers = {};
  }

  set(key, value) {
    this.headers[key] = value;
    return this;
  }

  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  }

  send(body) {
    const status = this.statusCode || 200;
    const headers = this.headers;
    this.callback(null, { status, body, headers });
  }

}

module.exports = SandboxResponse;
