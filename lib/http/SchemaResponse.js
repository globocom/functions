const config = require('../support/config');

class SchemaResponse {
  constructor(functionsRequest, res, schemaName) {
    this.functionsRequest = functionsRequest;
    this.res = res;
    this.schemaName = schemaName;
    this.allowedFields = config.responseAllowedFields;
  }

  removeNotAllowedFields(data) {
    const fieldsToRemove = Object.keys(data.env.filter(field => !this.allowedFields.includes(field)));
    for (const field of fieldsToRemove) {
      delete data.env[field];
    }
  }

  json(data) {
    this.removeNotAllowedFields(data);
    const schemeAndAuthority = this.functionsRequest.schemeAndAuthority();
    this.res.set('Content-Type', `application/json; charset=utf-8; profile=${schemeAndAuthority}/_schemas/${this.schemaName}`);
    this.res.end(JSON.stringify(data));
  }
}

module.exports = SchemaResponse;
