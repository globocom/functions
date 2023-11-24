const config = require("../support/config");
const fetch = require('node-fetch');
const { GoogleAuth } = require("google-auth-library");
const { FunctionServiceClient } = require('@google-cloud/functions').v2;
// const { request } = require('gaxios');

const log = require("../support/log");

class GoogleFunctionProvider {
  constructor() {
  }

  async authenticate(url){
    try{
      const sa_auth = JSON.parse(Buffer.from(config.googleCloudCredentials, "base64").toString('ascii'))
      const client = new GoogleAuth().fromJSON(sa_auth);
      const token = await client.fetchIdToken(url)
      return `Bearer ${token}`
    }catch(err){
      throw err
    }
  }

  async run(req) {
    try {
      const zoneId = "us-central1"
      const projectId = "removed"
      const { namespace, id } = req.params
      const { body } = req
      const url = `https://${zoneId}-${projectId}.cloudfunctions.net/${namespace}_${id}`;

      const token = await this.authenticate(url)

      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        }
      })

      const contentType = response.headers['content-type'];

      const data = (contentType && contentType.includes('application/json')) ? await response.json() : await response.text()

      return {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          'x-serverless-engine': 'bs-functions; go v1.21.1;'
        },
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

  async deployFunction(){
    const projectId = "removed"
    const zoneId = "us-central1"
    const functionName = "backstage-kernel_hello-world"
    const entryPoint = 'helloHttp';
    const runtime = 'nodejs20';
    
    const keyFilePath = './backday.json';

    const auth = new GoogleAuth({
      keyFile: keyFilePath,
    });
    const client = new FunctionServiceClient({ auth });

    const functionObject = {
      "name": `projects/${projectId}/locations/${zoneId}/functions/${functionName}`,
      "buildConfig": {
        "entryPoint": entryPoint,
        "runtime": runtime,
        "source": {
          "storageSource": {
            "bucket": 'gcf-v2-sources-391036631868-us-central1',
            "object": 'backstage-kernel_hello-world/function-source.zip',
            "generation": '1700773129721671'
          },
          "source": 'storageSource'
        }
      },
      "serviceConfig": {
        "environmentVariables": {
          "test": "test",
        },
      },
    }
    const request = {
      "function": functionObject,
    };

    const [operation] = await client.updateFunction(request);
    const [response] = await operation.promise();
    console.log(response);
    return
  }
}

module.exports = GoogleFunctionProvider;
