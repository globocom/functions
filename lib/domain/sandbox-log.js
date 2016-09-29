const log = require('../support/log');


class SandboxLog {
    constructor(name) {
        this._prefix = `[${name}]`;
    }

    info() {
        logSandbox(this, 'info', arguments);
    }

    log() {
        logSandbox(this, 'info', arguments);
    }

    error() {
        logSandbox(this, 'error', arguments);
    }

    warn() {
        logSandbox(this, 'warn', arguments);
    }

    debug() {
        logSandbox(this, 'debug', arguments);
    }
}


function logSandbox(sandboxLog, level, args) {
    var logArgs = [sandboxLog._prefix].concat([].splice.call(args, 0));
    log[level].apply(log, logArgs);
}

exports.SandboxLog = SandboxLog;
