class Status {
  constructor(storage) {
    this.storage = storage;
  }

  async run() {
    const startTime = new Date().getTime();
    try {
      const reply = await this.storage.ping();
      return {
        name: this.storage.name,
        status: 'WORKING',
        message: reply.toString(),
        time: (new Date().getTime() - startTime),
      };
    } catch (error) {
      return {
        name: this.storage.name,
        status: 'FAILED',
        message: error.toString(),
        time: (new Date().getTime() - startTime),
      };
    }
  }
}

module.exports = Status;
