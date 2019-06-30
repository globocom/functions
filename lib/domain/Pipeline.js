const deepcopy = require('deepcopy');
const Metric = require('./Metric');

const { DefaultLogStorage } = require('./LogStorage');
const ErrorTracker = require('./ErrorTracker');

function codeFileName(namespace, codeId) {
  return `${namespace}/${codeId}.js`;
}

class Pipeline {
  constructor(sandbox, req, steps) {
    this.sandbox = sandbox;
    this.req = req;
    this.steps = steps;
    this.previousResult = null;

    this.breadcrumbs = [];
  }
  run() {
    return this.runStep();
  }
  async runStep() {
    const [step, ...nextSteps] = this.steps;
    this.steps = nextSteps;

    const metric = new Metric('function-run');
    const filename = codeFileName(step.namespace, step.id);
    const logStorage = new DefaultLogStorage(step.namespace, step.id, this.req);

    const options = {
      console: logStorage.console,
      env: step.env,
    };

    try {
      const result = await this.sandbox.runScript(step.script, this.req, options);
      const spent = metric.observeFunctionRun({
        namespace: step.namespace,
        id: step.id,
        status: result.status,
      });

      logStorage.flush({
        status: result.status,
        requestTime: spent,
      });

      const previousResult = this.previousResult;
      this.previousResult = result;
      this.pushBreadcrumb(filename, result);
      if (result.status === 304) {
        if (previousResult) {
          result.status = previousResult.status;
          result.body = deepcopy(previousResult.body);
        }
      } else if (result.status === 200) {
        this.req.body = deepcopy(result.body);
      } else {
        result.body.namespace = step.namespace;
        result.body.functionId = step.id;

        return result;
      }

      if (this.steps.length === 0) {
        return result;
      }

      return this.runStep();
    } catch (err) {
      const status = err.statusCode || 500;

      const spent = metric.observeFunctionRun({
        namespace: step.namespace,
        id: step.id,
        status,
      });

      logStorage.console.error(`Failed to run function: ${err.message}, ${spent} seconds`);
      logStorage.console.error(err.stack);

      const logResult = logStorage.flush({
        status,
        requestTime: spent,
      });

      const { namespaceSettings } = step;
      const { sentryDSN } = namespaceSettings || {};

      const extra = Object.assign({ body: this.req.body }, logResult || {});
      const errTracker = new ErrorTracker({
        sentryDSN,
        filename,
        extra,
        tags: { codeHash: step.hash },
        code: step.code,
        breadcrumbs: this.breadcrumbs,
      });

      errTracker.notify(err);

      throw err;
    }
  }

  pushBreadcrumb(filename, result) {
    const breadcrumb = {
      data: { status: result.status, body: JSON.stringify(result.body) },
      level: 'info',
      category: 'step',
      message: filename,
      timestamp: +new Date() / 1000,
    };
    if (result.status >= 500) {
      breadcrumb.level = 'error';
    } else if (result.status >= 400) {
      breadcrumb.level = 'warn';
    }

    this.breadcrumbs.push(breadcrumb);
  }
}

module.exports = Pipeline;
