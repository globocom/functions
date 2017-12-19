const ErrorTracker = require('./ErrorTracker');


class Status {
  constructor(storage) {
    this.storage = storage;
  }

  async run() {
    this.services = [];
    this.startTime = new Date().getTime();

    try {
      const reply = await this.storage.ping();
      this.push({
        name: this.storage.name,
        status: 'WORKING',
        message: reply.toString(),
      });
    } catch (error) {
      this.push({
        name: this.storage.name,
        status: 'FAILED',
        message: error.toString(),
      });
    }

    try {
      const reply = await ErrorTracker.ping();
      this.push({
        name: ErrorTracker.name,
        status: 'WORKING',
        message: reply,
      });
    } catch (error) {
      this.push({
        name: ErrorTracker.name,
        status: 'FAILED',
        message: error.toString(),
      });
    }

    return this.services;
  }

  push({ name, status, message }) {
    this.services.push({
      name,
      status,
      message,
      time: (new Date().getTime() - this.startTime),
    });
  }
}

module.exports = Status;
