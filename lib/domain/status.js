const _ = require('lodash');
const logger = require('../support/log');

const FAILED = 'FAILED';
const WORKING = 'WORKING';

function includeResponseTime(promise) {
  const startTime = new Date().getTime();

  return new Promise((resolve) => {
    promise.then((value) => {
      value.time = (new Date().getTime() - startTime);
      resolve(value);
    }, (error) => {
      error.time = (new Date().getTime() - startTime);
      resolve(error);
    });
  });
}

class Status {
  constructor(storage) {
    this.storage = storage;
  }

  run() {
    const service = new Promise((resolve, reject) => {
      this.storage.ping().then((reply) => {
        resolve({
          name: this.storage.name,
          status: WORKING,
          message: reply.toString()
        });
      }, (reply) => {
        reject({
          name: this.storage.name,
          status: FAILED,
          message: reply.toString()
        });
      });
    });

    return includeResponseTime(service);
  }
}

module.exports = Status;
