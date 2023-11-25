const config = require("../support/config");
const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');
const { FunctionServiceClient } = require('@google-cloud/functions').v2;
const { Storage } = require('@google-cloud/storage');
// const { request } = require('gaxios');

const log = require("../support/log");

const fs = require("fs");
const logger = require("../support/log");

class GoogleFunctionProvider {
  GOOGLE_AUTH_CLIENT;
  GOOGLE_AUTH_SERVICE_CREDENTIAL;
  GOOGLE_CLOUD_FUNCTIONS_CLIENT;

  constructor() {
    this.GOOGLE_AUTH_SERVICE_CREDENTIAL = JSON.parse(Buffer.from(config.googleCloudCredentials, "base64").toString('ascii'))
    this.GOOGLE_AUTH_CLIENT = new GoogleAuth().fromJSON(this.GOOGLE_AUTH_SERVICE_CREDENTIAL);
    this.GOOGLE_CLOUD_FUNCTIONS_CLIENT = new FunctionServiceClient({
      credentials: {
        client_email: this.GOOGLE_AUTH_SERVICE_CREDENTIAL.client_email,
        private_key: this.GOOGLE_AUTH_SERVICE_CREDENTIAL.private_key,
      },
    });
  }

  async authenticate(url){
    try{
      const token = await this.GOOGLE_AUTH_CLIENT.fetchIdToken(url)
      return `Bearer ${token}`
    }catch(err){
      throw err
    }
  }

  async run(req) {
    try {
      const zoneId = config.gcfZoneId
      const projectId = config.gcfProjectId
      const { namespace, id, runtime } = req.params
      const { body } = req

      const functionName = `${namespace}_${id}`
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

      const contentType = response.headers.get('content-type');

      const data = (contentType && contentType.includes('application/json')) ? await response.json() : await response.text()

      return {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers),
          'x-serverless-engine': `bs-functions; ${runtime}`
        },
        body: data
      }
    } catch (ex) {
      throw ex
    }
  }

  async getEnvironmentVariables(projectId, zoneId, functionName){

  }

  async _getRemoteMetadata(projectId, zoneId, functionName){
    try {
      const [functionMetadata] = await this.GOOGLE_CLOUD_FUNCTIONS_CLIENT.getFunction({
        name: `projects/${projectId}/locations/${zoneId}/functions/${functionName}`
      })
      return functionMetadata
    } catch(err) {
      if(err.code == 5){
        return false
      }

      throw err
    }

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

  async deployFunction(req){
    try{
      const { namespace, id } = req.params
      const { runtime, entrypoint } = req.body
      const { file } = req

      const functionName = `${namespace}_${id}`
      const projectId = config.gcfProjectId
      const zoneId = config.gcfZoneId
      const bucketName = config.gcfBucketId

      const storage = new Storage({
        credentials: {
            client_email: this.GOOGLE_AUTH_SERVICE_CREDENTIAL.client_email,
            private_key: this.GOOGLE_AUTH_SERVICE_CREDENTIAL.private_key,
        },
      });

      const _bucket = storage.bucket(bucketName)

      const objectName = `${functionName}/function-source.zip`

      const [uploadedFile] = await _bucket.upload(file.path, {destination: objectName})
      const { bucket, name, generation } = uploadedFile.metadata

      const functionMetadata = await this._getRemoteMetadata(projectId, zoneId, functionName)

      const functionPayload = {
        ...functionMetadata,
        name: `projects/${projectId}/locations/${zoneId}/functions/${functionName}`,
        description: "foo bar testando updated",
        buildConfig: {
            runtime,
            entryPoint: entrypoint,
            source: {
                "storageSource": {
                    "bucket": bucket,
                    "object": name,
                    "generation": generation
                },
                "source": "storageSource"
            }
        },
        environment: 'GEN_2',
      }

      if(!functionMetadata){
        const functionCreated = await this.GOOGLE_CLOUD_FUNCTIONS_CLIENT.createFunction({
          parent: `projects/${projectId}/locations/${zoneId}`,
          functionId: functionName,
          function: functionPayload
        })
        logger.info(`Function ${functionName} created at GCF Provider`)

      }else {
        const functionUpdated = await this.GOOGLE_CLOUD_FUNCTIONS_CLIENT.updateFunction({
          function: functionPayload
        })
        logger.info(`Function ${functionName} updated at GCF Provider`)
      }

      return true
    } catch(err){
      if(err.code == 10){
        err.message = `Operação cancelada. Existe outro deploy em andamento. mensagem do erro original: (${err.message})`
      }

      throw err
    }
  }
}

module.exports = GoogleFunctionExecutor;
