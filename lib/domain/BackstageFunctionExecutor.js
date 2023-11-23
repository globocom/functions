

class BackstageFunctionExecutor {
  constructor(req) {
    this.memoryStorage = req.app.get('memoryStorage');
  }

  async run() {
    let code;

    try {
      code = await this.memoryStorage.getCodeByCache(namespace, id, {
        preCache: (preCode) => {
          preCode.script = sandbox.compileCode(filename, preCode.code);
          return preCode;
        },
      });
  
      if (!code) {
        const error = new Error(`Code '${namespace}/${id}' is not found`);
        error.statusCode = 404;
        reportError(span, error);
        throw error;
      }
    } catch (err) {
      reportError(span, err);
      res.status(err.statusCode || 500).json({ error: err.message });
      return;
    }

    return await sandbox.runScript(code.script, req, options);
  
}

module.exports = FunctionExecutorFactory;
