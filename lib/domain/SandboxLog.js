const log = require('../support/log');

function logSandbox(sandboxLog, level, args) {
  sandboxLog.logger[level](sandboxLog.prefix, ...args);
}


class SandboxLog {
  constructor(name, logger = null) {
    this.prefix = `[${name}]`;
    if (logger) {
      this.logger = logger;
    } else {
      this.logger = log;
    }
  }

  info(...args) {
    logSandbox(this, 'info', args);
  }

  log(...args) {
    logSandbox(this, 'info', args);
  }

  error(...args) {
    logSandbox(this, 'error', args);
  }

  warn(...args) {
    logSandbox(this, 'warn', args);
  }

  debug(...args) {
    logSandbox(this, 'debug', args);
  }
}

module.exports = SandboxLog;
