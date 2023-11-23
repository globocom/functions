const { reportError } = require("../support/tracing");
const SpanConsoleWrapper = require("./SpanConsoleWrapper");


class BackstageFunctionExecutor {

  async run(req) {
    let code;
    const { namespace, id, filename, logStorage, span } = req.params
    const memoryStorage = req.app.get('memoryStorage');
    const sandbox = req.app.get('sandbox');


    try {
      code = await memoryStorage.getCodeByCache(namespace, id, {
        preCache: (preCode) => {
          preCode.script = sandbox.compileCode(filename, preCode.code);
          return preCode;
        },
      });



      if (!code) {
        const error = new Error(`Code '${namespace}/${id}' is not found`);
        error.statusCode = 404;
        // reportError(span, error);
        throw error;
      }
    } catch (err) {
      // reportError(span, err);
      err.statusCode = err.statusCode || 500
      err.error = err.message
      throw err
    }

    const options = {
      console: new SpanConsoleWrapper(logStorage.console, span),
      env: code.env,
      span,
    };

    return await sandbox.runScript(code.script, req, options);
  }
}

module.exports = BackstageFunctionExecutor;
