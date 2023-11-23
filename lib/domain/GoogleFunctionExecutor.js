const config = require("../support/config");
const { fetch } = require('node-fetch');
// const { request } = require('gaxios');

const log = require("../support/log");

class GoogleFunctionExecutor {
  constructor() {
  }

  async authenticate(url){
    try{
      const sa_auth = JSON.parse(config.googleCloudCredentials)
      const client = new GoogleAuth().fromJSON(sa_auth);
      const token = await client.fetchIdToken(url)
      return `Bearer ${token}`
    }catch(err){
      throw err
    }
  }

  async run(zoneId, projectId, functionName, body) {
    try{
      const url = `https://${zoneId}-${projectId}.cloudfunctions.net/${functionName}`;

      const token = await authenticate(url)

      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        }
      })

      const data = (contentType && contentType.includes('application/json')) ? await response.json() : await response.text()

      return {
        status: response.status,
        headers: response.headers,
        body: data
      }
    } catch (ex) {
      throw ex
    }
  }

  async getEnvironmentVariables(projectId, functionName){

  }

  async putEnvironmentVariables(projectId, functionName, variables){
    const url = `https://cloudfunctions.googleapis.com/v1/projects/${projectId}/locations/-/functions/${functionName}`

    const token = await authenticate(url)

    const response = await request({
      url,
      method: "POST",
      data: {},
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      }
    })

    return response
  }

}

module.exports = GoogleFunctionExecutor;
