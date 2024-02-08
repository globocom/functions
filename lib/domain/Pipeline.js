const deepcopy = require('deepcopy');
const Metric = require('./Metric');
const log = require('../support/log');

const { DefaultLogStorage } = require('./LogStorage');
const ErrorTracker = require('./ErrorTracker');
const SpanConsoleWrapper = require('./SpanConsoleWrapper');
const { reportError } = require('../support/tracing');

function codeFileName(namespace, codeId) {
  return `${namespace}/${codeId}.js`;
}

class Pipeline {
  constructor(sandbox, req, steps, span) {
    this.sandbox = sandbox;
    this.req = req;
    this.steps = steps;
    this.previousResult = null;

    this.span = span;
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
    const span = this.span.tracer().startSpan('run function', {
      childOf: this.span,
      tags: {
        'function.namespace': step.namespace,
        'function.id': step.id,
      },
    });

    const options = {
      console: new SpanConsoleWrapper(logStorage.console, span),
      env: step.env,
      span,
    };

    try {
      const runScriptMetric = new Metric('run-script');
      const result = await this.sandbox.runScript(step.script, this.req, options);
      runScriptMetric.observeFunctionRunScript({ namespace, id });

      const spent = metric.observeFunctionRun({
        namespace: step.namespace,
        id: step.id,
        status: result.status,
      });

      logStorage.flush({
        status: result.status,
        requestTime: spent,
      });

      log.info({
        method: this.req.method,
        request_uri: this.req.url,
        status: result.status,
        request_id: this.req.headers["x-request-id"] || "",
        request_time: spent,
        namespace: step.namespace,
        function_id: step.id,
      })

      const previousResult = this.previousResult;
      this.previousResult = result;
      this.pushBreadcrumb(filename, result);
      if (result.status === 304) {
        span.log({ message: 'Not modified' });
        if (previousResult) {
          result.status = previousResult.status;
          result.body = deepcopy(previousResult.body);
        }
      } else if (result.status === 200) {
        this.req.body = deepcopy(result.body);
      } else {
        result.body.namespace = step.namespace;
        result.body.functionId = step.id;

        span.finish();
        return result;
      }

      span.finish();
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

      log.info({
        method: this.req.method,
        request_uri: this.req.url,
        status: status,
        request_id: this.req.headers["x-request-id"] || "",
        request_time: spent,
        namespace: step.namespace,
        function_id: step.id,
      })

      logStorage.console.error(`Failed to run function: ${err.message}, ${spent} seconds`);
      logStorage.console.error(err.stack);
      reportError(span, err);

      const logResult = logStorage.flush({
        status,
        requestTime: spent,
      });

      const { sentryDSN } = step;

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

      err.details = {
        message: `Got error when execute pipeline function ${step.namespace}/${step.id}`,
      }

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
