class SchemaResponse {
  constructor(functionsRequest, res, schemaName) {
    this.functionsRequest = functionsRequest;
    this.res = res;
    this.schemaName = schemaName;
  }

  json(data) {
    const schemeAndAuthority = this.functionsRequest.schemeAndAuthority();
    this.res.set('Content-Type', `application/json; charset=utf-8; profile=${schemeAndAuthority}/_schemas/${this.schemaName}`);
    this.res.end(JSON.stringify(data));
  }
}

module.exports = SchemaResponse;
