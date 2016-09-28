const log = require('./log');


class SandboxLog {
    constructor(name) {
        this._prefix = `[${name}]`;
    }

    info() {
        _log(this, 'info', arguments);
    }

    log() {
        _log(this, 'info', arguments);
    }

    error() {
        _log(this, 'error', arguments);
    }

    warn() {
        _log(this, 'warn', arguments);
    }

    debug() {
        _log(this, 'debug', arguments);
    }
}


function _log(sandboxLog, level, args) {
    var logArgs = [sandboxLog._prefix].concat([].splice.call(args, 0));
    log[level].apply(log, logArgs);
}

exports.SandboxLog = SandboxLog;
