const FAILED = 'FAILED';
const WORKING = 'WORKING';

function includeResponseTime(promise) {
  const startTime = new Date().getTime();

  return new Promise((resolve, reject) => {
    promise.then((values) => {
      values.time = (new Date().getTime() - startTime);
      resolve(values);
    }, (values) => {
      values.time = (new Date().getTime() - startTime);
      reject(values);
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
          message: reply.toString(),
        });
      }, (reply) => {
        reject({
          name: this.storage.name,
          status: FAILED,
          message: reply.toString(),
        });
      });
    });

    return includeResponseTime(service);
  }
}

module.exports = Status;
