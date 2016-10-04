const vm = require('vm');
const stackTrace = require('stack-trace');
const SandboxLog = require('../domain/SandboxLog');
const SandboxRequire = require('../domain/sandbox/SandboxRequire');

const config = require('../support/config');
const log = require('../support/log');

const CODE_FOOT = 'main.apply(null, Backstage.__arguments);';


function codeFileName(namespace, codeId) {
  return `${namespace}/${codeId}.js`;
}

function encapsulateCode(sandbox, code) {
  const scriptArguments = Object.keys(sandbox.context).join(', ');

  return `((${scriptArguments}) => {
${code}
})(${scriptArguments});`;
}


function filterStackTrace(filename, e) {
  const lines = stackTrace.parse(e);

  return lines
    .filter(line => line.fileName === filename)
    .map((line) => {
      if (line.functionName) {
        return `at ${line.functionName} (${line.fileName}:${line.lineNumber})`;
      }
      return `at ${line.fileName}:${line.lineNumber}`;
    })
    .join('\n');
}


class Sandbox {
  constructor() {
    this.context = {
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
    const exports = {};
    const sandboxLog = new SandboxLog(`${namespace}/${codeId}`);
    const sandboxRequire = new SandboxRequire();

    this.context.Backstage = {
      modules: {},
    };

    this.context.console = sandboxLog;
    this.context.Buffer = Buffer;
    this.context.setTimeout = setTimeout;
    this.context.exports = exports;
    this.context.module = { exports };
    this.context.require = sandboxRequire.generateRequire();
    this.context.relativeRequire = sandboxRequire.generateRelativeRequire();

    if (backstageOptions) {
      for (const key of Object.keys(backstageOptions)) {
        this.context.Backstage[key] = backstageOptions[key];
      }
    }

    return vm.createContext(this.context);
  }

  testSyntaxError(namespace, codeId, code) {
    const filename = codeFileName(namespace, codeId);
    const text = encapsulateCode(this, code);

    try {
      const script = new vm.Script(text, { filename, displayErrors: false, lineOffset: -1 });
      const context = this.createEmptyContext(namespace, codeId);
      script.runInContext(context, { timeout: config.syncTimeout });
    } catch (e) {
      const error = e.toString();
      const stack = filterStackTrace(filename, e);

      return { error, stack };
    }

    return null;
  }

  compileCode(namespace, codeId, code) {
    const text = encapsulateCode(this, code.code + CODE_FOOT);

    log.debug('Compiling code', text);

    return new vm.Script(text, {
      filename: codeFileName(namespace, codeId),
      displayErrors: true,
      timeout: config.syncTimeout,
    });
  }

  runScript(namespace, codeId, script, args) {
    return new Promise((accept, reject) => {
      const callback = (err, value) => {
        if (err) {
          reject(err);
        } else {
          accept(value);
        }
      };
      args.push(callback);

      const context = this.createEmptyContext(namespace, codeId, {
        __arguments: args,
      });

      const filename = codeFileName(namespace, codeId);
      script.runInContext(context, {
        filename,
        timeout: config.syncTimeout,
        displayErrors: false,
        lineOffset: -1,
      });
    });
  }
}


exports.Sandbox = Sandbox;
