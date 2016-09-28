const vm = require('vm');
const SandboxLog = require('./sandbox-log').SandboxLog;
const config = require('./config');
const log = require('./log');


const CODE_FOOT = `Backstage.defines[Backstage.__defineName].apply(null, Backstage.__defineArguments);`;


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
            define: null
        };
    }

    createEmptyContext(codeId, backstageOptions) {
        let exports = {};
        let log = new SandboxLog(codeId);

        this._sandbox.Backstage = {
            defines: {},
            define: (hookName, func) => {
                this._sandbox.Backstage.defines[hookName] = func;
            },
            modules: {},
        };

        this._sandbox.console = log;
        this._sandbox.Buffer = Buffer;
        this._sandbox.setTimeout = setTimeout;
        this._sandbox.exports = exports;
        this._sandbox.module = {exports};

        // for compatibility
        this._sandbox.define = this._sandbox.Backstage.define;

        if (backstageOptions) {
            for (let key in backstageOptions) {
                this._sandbox.Backstage[key] = backstageOptions[key];
            }
        }

        return vm.createContext(this._sandbox);
    }

    discoveryDefines(codeId, code) {
        let script = new vm.Script(code, {filename: codeId+'.js', displayErrors: false});
        let context = this.createEmptyContext(codeId);
        script.runInContext(context, {timeout: config.syncTimeout});

        return Object.keys(context.Backstage.defines);
    }

    compileCode(codeId, code) {
        let scriptArguments = Object.keys(this._sandbox).join(', ');

        let closureStart = '(function(' + scriptArguments + ') {\n';
        let closureEnd = '\n})(' + scriptArguments + ');\n';
        let text = closureStart + code.code + CODE_FOOT + closureEnd;

        log.debug('Compiling code', text);

        return new vm.Script(text, {
            filename: codeId+'.js',
            displayErrors: true,
            timeout: config.syncTimeout
        });
    }

    runScript(codeId, script, defineName, args) {
        return new Promise((accept, reject) => {
            let callback = (err, value) => {
                if (err) {
                    reject(err);
                } else {
                    accept(value);
                }
            };
            args.push(callback);

            let context = this.createEmptyContext(codeId, {
                __defineName: defineName,
                __defineArguments: args,
            });

            script.runInContext(context, {timeout: config.syncTimeout});
        });
    }
}

exports.Sandbox = Sandbox;
