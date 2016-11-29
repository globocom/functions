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

    return this.sandbox.runScript(step.script, this.req, { prefix: stepPrefix })
      .then((result) => {
        metric.finish({
          filename,
          status: result.status,
        });

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
      })
      .catch((err) => {
        log.error(`[${stepPrefix}] Failed to run function: ${err}`);
        const status = err.statusCode || 500;

        metric.finish({
          filename,
          status,
          error: err.message,
        });
      });
  }
}


module.exports = Pipeline;
