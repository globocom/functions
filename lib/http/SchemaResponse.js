class SchemaResponse {
  constructor(req, res, schemaName) {
    this.req = req;
    this.res = res;
    this.schemaName = schemaName;
  }

  json(data) {
    const absUrl = `${this.req.protocol}://${this.req.get('Host')}`;
    this.res.set('Content-Type', `application/json; charset=utf-8; profile=${absUrl}/_schemas/${this.schemaName}`);
    this.res.end(JSON.stringify(data));
  }
}

module.exports = SchemaResponse;
