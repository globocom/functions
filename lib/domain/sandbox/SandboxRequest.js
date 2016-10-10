
class SandobxRequest {
  constructor({ headers, query, body }) {
    this.headers = headers;
    this.query = query;
    this.body = body;
  }
}

module.exports = SandobxRequest;
