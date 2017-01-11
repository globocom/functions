const deepcopy = require('deepcopy');
const Metric = require('./Metric');
const log = require('../support/log');


function prefix(namespace, codeId) {
  return `namespace:${namespace}, id:${codeId}`;
}

function codeFileName(namespace, codeId) {
  return `${namespace}/${codeId}.js`;
}

class Pipeline {
  constructor(sandbox, req, steps) {
    this.sandbox = sandbox;
    this.req = req;
    this.steps = steps;
    this.previousResult = null;
    this.totalMetric = new Metric('pipeline-run');
  }
  run() {
    return this.runStep();
  }
  runStep() {
    const [step, ...nextSteps] = this.steps;
    this.steps = nextSteps;

    const stepPrefix = prefix(step.namespace, step.id);
    const metric = new Metric('function-run');
    const filename = codeFileName(step.namespace, step.id);
    const options = {
      prefix: stepPrefix,
      env: step.env,
    };

    return this.sandbox.runScript(step.script, this.req, options)
      .then((result) => {
        const spent = metric.finish({
          filename,
          status: result.status,
        });
        log.info(`[${stepPrefix}] Step finished ${spent} ms`);

        const previousResult = this.previousResult;
        this.previousResult = result;

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
      }, (err) => {
        const status = err.statusCode || 500;

        const spent = metric.finish({
          filename,
          status,
          error: err.message,
        });
        log.error(`[${stepPrefix}] Failed to run function: ${filename} ${err}, ${spent} ms`);
        log.error(`[${stepPrefix}] ${err.stack}`);
        throw err;
      });
  }
}


module.exports = Pipeline;
