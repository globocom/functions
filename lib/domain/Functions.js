const crypto = require('crypto');
const semver = require('semver');

const log = require('../support/log');
const { StdoutLogStorage, DefaultLogStorage } = require('./LogStorage');

const Metric = require('./Metric');

const Pipeline = require('./Pipeline');
const ErrorTracker = require('./ErrorTracker');

function codeFileName(namespace, codeId, version) {
  if (version === undefined || version === 'latest') {
    return `${namespace}/${codeId}.js`;
  }
  return `${namespace}/${codeId}/${version}.js`;
}

class Functions {
  constructor(storage, sandbox, req) {
    this.storage = storage;
    this.sandbox = sandbox;
    this.req = req;
  }

  async updateVersion(namespace, id, version) {
    if (!version) {
      return;
    }

    // Latest versions are saved to namespace
    let latest = {};
    const ns = await this.storage.getNamespace(namespace) || { namespace };

    if (ns.latest) {
      latest = ns.latest;
    }

    if (Object.prototype.hasOwnProperty.call(latest, id)) {
      const curVersion = latest[id];
      if (semver.gt(version, curVersion)) {
        latest[id] = version;
      }
    } else {
      latest[id] = version;
    }

    ns.latest = latest;
    await this.storage.putNamespace(namespace, ns);
  }

  async create(namespace, id, version, code, env) {
    let v = version;
    const filename = codeFileName(namespace, id, version);

    if (version === 'latest') {
      v = null;
    }

    const invalid = this.sandbox.testSyntaxError(filename, code, {
      console: new StdoutLogStorage(namespace, id, v).console,
    });
    if (invalid) {
      this.req.log.error(`Failed to post code: ${invalid.error}`);
      return {
        status: 400,
        body: invalid,
      };
    }

    const hash = crypto.createHash('sha1').update(code).digest('hex');
    const data = { id, version, code, hash };

    if (env) {
      data.env = env;
    }

    try {
      await this.storage.putCode(namespace, id, v, data);

      await this.updateVersion(namespace, id, v);

      return {
        status: 200,
        body: data,
      };
    } catch (err) {
      log.error(`[${namespace}:${id}:${version}] ${err}`);
      return {
        status: 500,
        body: { error: err.message },
      };
    }
  }

  async run(namespace, id, version) {
    let v = version;
    const filename = codeFileName(namespace, id, version);
    const metric = new Metric('function-run');

    const ns = await this.storage.getNamespace(namespace);
    if (!ns) {
      v = null;
    } else if (ns.latest && version === 'latest') {
      v = ns.latest[id];
    }

    const logStorage = new DefaultLogStorage(namespace, id, v, this.req);

    let code;
    try {
      code = await this.storage.getCodeByCache(namespace, id, v, {
        preCache: (preCode) => {
          preCode.script = this.sandbox.compileCode(filename, preCode.code);
          return preCode;
        },
      });

      if (!code) {
        const errMsg = v ? `Code '${namespace}/${id}/${v}' was not found` : `Code '${namespace}/${id}' was not found`;
        return {
          status: 404,
          body: { error: errMsg },
        };
      }
    } catch (err) {
      return {
        status: err.statusCode || 500,
        body: { error: err.message },
      };
    }

    try {
      const options = {
        console: logStorage.console,
        env: code.env,
      };
      const result = await this.sandbox.runScript(code.script, this.req, options);

      const spent = metric.observeFunctionRun({ namespace, id, version, status: result.status });
      logStorage.flush({
        status: result.status,
        requestTime: spent,
      });
      return result;
    } catch (err) {
      logStorage.console.error(`Failed to run function: ${err}`);
      logStorage.console.error(err.stack);
      const status = err.statusCode || 500;
      const errResult = {
        status,
        body: { error: err.message },
      };

      const spent = metric.observeFunctionRun({ namespace, id, version, status });

      const logResult = logStorage.flush({
        status,
        requestTime: spent,
      });

      const { sentryDSN } = code;

      const extra = Object.assign({ body: this.req.body }, logResult || {});
      const errTracker = new ErrorTracker({
        sentryDSN,
        filename,
        extra,
        tags: { codeHash: code.hash },
        code: code.code,
      });
      errTracker.notify(err);
      return errResult;
    }
  }

  async runPipeline(stepsInput) {
    const metric = new Metric('pipeline-run');

    const stepsPromises = stepsInput.map(async (step) => {
      const [namespace, id, version] = step.split('/', 3);
      const ns = await this.storage.getNamespace(namespace);

      // Return versioned function
      if (version !== undefined || version !== 'latest') {
        return { namespace, id, version };
      }

      // Handle latest and unversioned functions
      let v = version;
      if (!ns) {
        v = null;
      } else if (ns.latest && version === 'latest') {
        v = ns.latest[id];
      }
      return { namespace, id, version: v };
    });

    const steps = await Promise.all(stepsPromises);

    try {
      const codes = await this.storage.getCodesByCache(steps, {
        preCache: (code) => {
          const filename = codeFileName(code.namespace, code.id, code.version);
          code.script = this.sandbox.compileCode(filename, code.code);
          return code;
        },
      });

      for (let i = 0; i < codes.length; i += 1) {
        if (!codes[i]) {
          const { namespace, id, version } = steps[i];
          const codeName = version ? `${namespace}/${id}/${version}` : `${namespace}/${id}`;
          const e = new Error(`Code '${codeName}' was not found`);
          e.statusCode = 404;
          throw e;
        }
      }

      const result = await new Pipeline(this.sandbox, this.req, codes).run();
      metric.observePipelineRun(result.status);
      return result;
    } catch (err) {
      const result = {
        status: err.statusCode || 500,
        body: { error: err.message },
      };

      metric.observePipelineRun(result.status);
      return result;
    }
  }
}

module.exports = Functions;
