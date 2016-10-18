const config = require('../support/config');


class AsyncTimeout {
  constructor() {
    this.timeouts = [];
  }

  add(fn, timeout = null) {
    const fnTimeout = timeout || config.asyncTimeout;
    const timeoutID = setTimeout(fn, fnTimeout);

    this.timeouts.push(timeoutID);

    return this;
  }

  clear() {
    for (const timeoutID of this.timeouts) {
      clearTimeout(timeoutID);
    }
    this.timeouts = [];
    return this;
  }
}

module.exports = AsyncTimeout;
