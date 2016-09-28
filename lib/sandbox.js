const vm = require('vm');
const stackTrace = require('stack-trace');
const SandboxLog = require('./sandbox-log').SandboxLog;

const config = require('./config');
const log = require('./log');


const CODE_FOOT = `main.apply(null, Backstage.__arguments);`;


class Sandbox {
    constructor() {
        this._sandbox = {
            Backstage: null,
            Buffer: null,
            console: null,
            exports: null,
            module: null,
            setTimeout: null,
            require: null,
            relativeRequire: null,
        };
    }

    createEmptyContext(namespace, codeId, backstageOptions) {
        let exports = {};
        let log = new SandboxLog(`${namespace}/${codeId}`);

        this._sandbox.Backstage = {
            modules: {},
        };

        this._sandbox.console = log;
        this._sandbox.Buffer = Buffer;
        this._sandbox.setTimeout = setTimeout;
        this._sandbox.exports = exports;
        this._sandbox.module = {exports};

        if (backstageOptions) {
            for (let key in backstageOptions) {
                this._sandbox.Backstage[key] = backstageOptions[key];
            }
        }

        return vm.createContext(this._sandbox);
    }

    testSyntaxError(namespace, codeId, code) {
        let filename = _codeFileName(namespace, codeId);

        try {
            let script = new vm.Script(code, {filename: filename, displayErrors: false});
            let context = this.createEmptyContext(namespace, codeId);
            script.runInContext(context, {timeout: config.syncTimeout});
        } catch(e) {
            let error = e.toString();
            let stack = _filterStackTrace(filename, e);

            return {error, stack};
        }

        return null;
    }

    compileCode(namespace, codeId, code) {
        let scriptArguments = Object.keys(this._sandbox).join(', ');

        let closureStart = '(function(' + scriptArguments + ') {\n';
        let closureEnd = '\n})(' + scriptArguments + ');\n';
        let text = closureStart + code.code + CODE_FOOT + closureEnd;

        log.debug('Compiling code', text);

        return new vm.Script(text, {
            filename: _codeFileName(namespace, codeId),
            displayErrors: true,
            timeout: config.syncTimeout,
        });
    }

    runScript(namespace, codeId, script, args) {
        return new Promise((accept, reject) => {
            let callback = (err, value) => {
                if (err) {
                    reject(err);
                } else {
                    accept(value);
                }
            };
            args.push(callback);

            let context = this.createEmptyContext(namespace, codeId, {
                __arguments: args,
            });

            script.runInContext(context, {timeout: config.syncTimeout});
        });
    }
}

function _codeFileName(namespace, codeId) {
    return `${namespace}/${codeId}.js`;
}

function _filterStackTrace(filename, e) {
    let lines = stackTrace.parse(e);

    return lines
        .filter((line) => {
            return line.fileName === filename;
        })
        .map((line) => {
            if (line.functionName) {
                return `at ${line.functionName} (${line.fileName}:${line.lineNumber})`;
            } else {
                return `at ${line.fileName}:${line.lineNumber}`;
            }
        })
        .join('\n');
}

exports.Sandbox = Sandbox;
