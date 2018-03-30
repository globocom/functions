const ErrorTracker = require('../../domain/ErrorTracker');
const Metric = require('../../domain/Metric');
const { DefaultLogStorage } = require('../../domain/LogStorage');


function codeFileName(namespace, codeId) {
  return `${namespace}/${codeId}.js`;
}


async function functionRunHandler(req, res, { exposed }) {
  const { namespace, id } = req.params;
  const memoryStorage = req.app.get('memoryStorage');
  const sandbox = req.app.get('sandbox');
  const filename = codeFileName(namespace, id);
  const metric = new Metric('function-run');
  const logStorage = new DefaultLogStorage(namespace, id, req);

  let code;

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
      throw error;
    }
    if (exposed && !code.exposed) {
      const error = new Error('Unauthorized');
      error.statusCode = 403;
      throw error;
    }
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
    return;
  }

  try {
    const options = {
      console: logStorage.console,
      env: code.env,
    };
    const result = await sandbox.runScript(code.script, req, options);

    res.set(result.headers);
    res.status(result.status);
    res.json(result.body);

    const spent = metric.finish({
      filename,
      status: result.status,
    });

    logStorage.flush({
      status: result.status,
      requestTime: spent,
    });
  } catch (err) {
    logStorage.console.error(`Failed to run function: ${err}`);
    logStorage.console.error(err.stack);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });

    const spent = metric.finish({
      filename,
      status,
      error: err.message,
    });

    const logResult = logStorage.flush({
      status,
      requestTime: spent,
    });

    const { namespaceSettings } = code;
    const { sentryDSN } = namespaceSettings || {};

    const extra = Object.assign({ body: req.body }, logResult || {});
    const errTracker = new ErrorTracker({
      sentryDSN,
      filename,
      extra,
      tags: { codeHash: code.hash },
      code: code.code,
    });
    errTracker.notify(err);
  }
}

module.exports = functionRunHandler;
