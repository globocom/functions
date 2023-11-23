

class BackstageFunctionExecutor {

  async run(req) {
    let code;
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
}

module.exports = BackstageFunctionExecutor;
