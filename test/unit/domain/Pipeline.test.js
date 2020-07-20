const expect = require('chai').expect;
const opentracing = require('opentracing');

const Pipeline = require('../../../lib/domain/Pipeline');


const Sandbox = require('@globocom/backstage-functions-sandbox');


describe('Pipeline', () => {
  describe('#run', () => {
    let req;
    let sandbox;
    let step200;
    let step200env;
    let step304;
    let step200b;
    let step404;
    let stepCrash;
    let tracer;
    let span;

    beforeEach(() => {
      req = {
        body: {},
      };
      sandbox = new Sandbox({});
      step200 = {
        namespace: 'backstage',
        id: 'step200',
        script: sandbox.compileCode('200.js', `
                   function main(req, res) {
                       req.body.ok = true;
                       res.send(req.body);
                   }
              `),
      };
      step200b = {
        namespace: 'backstage',
        id: 'step200b',
        script: sandbox.compileCode('200b.js', `
                   function main(req, res) {
                       req.body.ok2 = true;
                       res.send(req.body);
                   }
              `),
      };
      step200env = {
        namespace: 'backstage',
        id: 'step200env',
        script: sandbox.compileCode('200b.js', `
                   function main(req, res) {
                       req.body.env = Object.assign({}, Backstage.env);
                       res.send(req.body);
                   }
              `),
        env: {
          STEP_VAR: 'foo',
        },
      };
      step304 = {
        namespace: 'backstage',
        id: 'step200',
        script: sandbox.compileCode('200.js', `
                   function main(req, res) {
                       res.notModified();
                   }
              `),
      };
      step404 = {
        namespace: 'backstage',
        id: 'step404',
        script: sandbox.compileCode('200.js', `
                   function main(req, res) {
                       res.notFound('Not found an item');
                   }
              `),
      };
      stepCrash = {
        namespace: 'backstage',
        id: 'stepCrash',
        script: sandbox.compileCode('crash.js', `
                   function main(req, res) {
                       res.undefinedMethod();
                   }
              `),
      };
      tracer = new opentracing.MockTracer();
      span = tracer.startSpan('test span');
    });

    it('should be able to run unique function', async () => {
      const result = await new Pipeline(sandbox, req, [step200], span).run();
      expect(result.body.ok).to.be.eql(true);
      expect(result.status).to.be.eql(200);
    });

    it('should be able to run unique function with 304', async () => {
      const result = await new Pipeline(sandbox, req, [step304], span).run();
      expect(result.status).to.be.eql(304);
      expect(result.body).to.be.eql(null);
    });

    it('should be able to run two functions', async () => {
      const result = await new Pipeline(sandbox, req, [step200, step200b], span).run();
      expect(result.body.ok).to.be.eql(true);
      expect(result.body.ok2).to.be.eql(true);
      expect(result.status).to.be.eql(200);
    });

    it('should be able to run three functions', async () => {
      const result = await new Pipeline(sandbox, req, [step200, step200b, step200env], span).run();
      expect(result.body.ok).to.be.eql(true);
      expect(result.body.ok2).to.be.eql(true);
      expect(result.body.env.STEP_VAR).to.be.eql('foo');
      expect(result.status).to.be.eql(200);

      const mockSpanReport = tracer.report();
      const spans = mockSpanReport.spans.filter(s => s.operationName() === 'run function');
      expect(spans.length).to.be.eql(3);
      expect(spans[0].durationMs()).to.be.gte(0);
    });

    it('should be able to run two functions, one with 304', async () => {
      const result = await new Pipeline(sandbox, req, [step200, step304], span).run();
      expect(result.body.ok).to.be.eql(true);
      expect(result.status).to.be.eql(200);
    });

    it('should be able to run three functions, two with 304', async () => {
      const result = await new Pipeline(sandbox, req, [step200, step304, step304], span).run();
      expect(result.body.ok).to.be.eql(true);
      expect(result.status).to.be.eql(200);
    });

    it('should be able to run three functions, one with 304', async () => {
      const result = await new Pipeline(sandbox, req, [step200, step304, step200b], span).run();
      expect(result.body.ok).to.be.eql(true);
      expect(result.body.ok2).to.be.eql(true);
      expect(result.status).to.be.eql(200);
    });

    it('should be able to run one function with 404', async () => {
      try {
        await new Pipeline(sandbox, req, [step404], span).run();
      } catch (err) {
        expect(err.message).to.be.eql('Not found an item');
        expect(err.statusCode).to.be.eql(404);
        return;
      }

      throw new Error('Not raised an error');
    });

    it('should be able to run three functions with 404', async () => {
      try {
        await new Pipeline(sandbox, req, [step200, step404, step200b], span).run();
      } catch (err) {
        expect(err.message).to.be.eql('Not found an item');
        expect(err.statusCode).to.be.eql(404);
        return;
      }

      throw new Error('Not raised an error');
    });

    it('should fail if the first function fail', async () => {
      try {
        await new Pipeline(sandbox, req, [step200, stepCrash], span).run();
        throw new Error('Not failed');
      } catch (err) {
        expect(err.message).to.be.eql('res.undefinedMethod is not a function');
      }

      const mockSpanReport = tracer.report();
      const spans = mockSpanReport.spans.filter(s => s.operationName() === 'run function');
      expect(spans.length).to.be.eql(2);
      expect(spans[0].durationMs()).to.be.gte(0);
      expect(spans[0].tags()).to.be.eql({});
      expect(spans[1].tags()).to.be.eql({ error: true });
    });
  });
});
