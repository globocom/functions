const expect = require('chai').expect;

const Pipeline = require('../../../lib/domain/Pipeline');


const Sandbox = require('backstage-functions-sandbox');


describe('Pipeline', () => {
  describe('#run', () => {
    let req;
    let sandbox;
    let step200;
    let step304;
    let step200b;
    let step404;

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
    });

    it('should be able to run unique function', (done) => {
      new Pipeline(sandbox, req, [step200])
        .run()
        .then((result) => {
          expect(result.body.ok).to.be.eql(true);
          expect(result.status).to.be.eql(200);
          done();
        })
        .catch(err => done(err));
    });
    it('should be able to run unique function with 304', (done) => {
      new Pipeline(sandbox, req, [step304])
        .run()
        .then((result) => {
          expect(result.status).to.be.eql(304);
          expect(result.body).to.be.eql(null);
          done();
        })
        .catch(err => done(err));
    });
    it('should be able to run two functions', (done) => {
      new Pipeline(sandbox, req, [step200, step200b])
        .run()
        .then((result) => {
          expect(result.body.ok).to.be.eql(true);
          expect(result.body.ok2).to.be.eql(true);
          expect(result.status).to.be.eql(200);
          done();
        })
        .catch(err => done(err));
    });
    it('should be able to run two functions, one with 304', (done) => {
      new Pipeline(sandbox, req, [step200, step304])
        .run()
        .then((result) => {
          expect(result.body.ok).to.be.eql(true);
          expect(result.status).to.be.eql(200);
          done();
        })
        .catch(err => done(err));
    });
    it('should be able to run three functions, two with 304', (done) => {
      new Pipeline(sandbox, req, [step200, step304, step304])
        .run()
        .then((result) => {
          expect(result.body.ok).to.be.eql(true);
          expect(result.status).to.be.eql(200);
          done();
        })
        .catch(err => done(err));
    });
    it('should be able to run three functions, one with 304', (done) => {
      new Pipeline(sandbox, req, [step200, step304, step200b])
        .run()
        .then((result) => {
          expect(result.body.ok).to.be.eql(true);
          expect(result.body.ok2).to.be.eql(true);
          expect(result.status).to.be.eql(200);
          done();
        })
        .catch(err => done(err));
    });

    it('should be able to run one function with 404', (done) => {
      new Pipeline(sandbox, req, [step404])
        .run()
        .then((result) => {
          expect(result.body.error).to.be.eql('Not found an item');
          expect(result.status).to.be.eql(404);
          done();
        })
        .catch(err => done(err));
    });

    it('should be able to run three functions with 404', (done) => {
      new Pipeline(sandbox, req, [step200, step404, step200b])
        .run()
        .then((result) => {
          expect(result.body.error).to.be.eql('Not found an item');
          expect(result.body.namespace).to.be.eql('backstage');
          expect(result.body.functionId).to.be.eql('step404');
          expect(result.status).to.be.eql(404);
          done();
        })
        .catch(err => done(err));
    });
  });
});
