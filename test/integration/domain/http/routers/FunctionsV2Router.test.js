const request = require('supertest');
const expect = require('chai').expect;
const routes = require('../../../../../lib/http/routes');

describe('FunctionV2Router integration', () => {
  describe('PUT /v2/functions/:namespace/:id/:version', () => {
    describe('when code is correct', () => {
      const code = `
        function main(req, res) {
          res.send({ foo: 'bar' });
        }
      `;

      it('should put the code at the function', (done) => {
        request(routes)
          .put('/v2/functions/functionv2-router-test/test1/0.0.1')
          .send({ code })
          .expect('content-type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            }
            expect(res.body.code).to.be.eql(code);
            expect(res.body.id).to.be.eql('test1');
            expect(res.body.version).to.be.eql('0.0.1');
            done();
          });
      });
    });
  });

  describe('PUT v1 and GET v2 with latest', () => {
    let code;
    before((done) => {
      code = `
        function main(req, res) {
          res.send({ foo: 'bar' });
        }
      `;

      request(routes)
        .put('/functions/function-v1/test1')
        .send({ code })
        .expect(200)
        .expect('content-type', /json/, done);
    });

    it('should return the code at latest version', (done) => {
      request(routes)
        .get('/v2/functions/function-v1/test1/latest')
        .expect(200)
        .expect('content-type', /json/)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.code).to.be.eql(code);
          expect(res.body.id).to.be.eql('test1');
          expect(res.body.version).to.be.eql(null);
          done();
        });
    });
  });

  describe('PUT v2 and GET v1', () => {
    let code;
    before((done) => {
      code = `
        function main(req, res) {
          res.send({ foo: 'bar' });
        }
      `;

      request(routes)
        .put('/v2/functions/function-v2/test1/0.0.1')
        .send({ code })
        .expect(200)
        .expect('content-type', /json/);

      request(routes)
        .put('/v2/functions/function-v2/test1/0.0.2')
        .send({ code })
        .expect(200)
        .expect('content-type', /json/, done);
    });

    it('should return the code at latest version', (done) => {
      request(routes)
        .get('/functions/function-v2/test1')
        .expect(200)
        .expect('content-type', /json/)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.code).to.be.eql(code);
          expect(res.body.id).to.be.eql('test1');
          expect(res.body.version).to.be.eql('0.0.2');
          done();
        });
    });
  });

  describe('PUT v2 old version and GET v1 latest', () => {
    let code;
    before((done) => {
      code = `
        function main(req, res) {
          res.send({ foo: 'bar' });
        }
      `;

      // newer version
      request(routes)
        .put('/v2/functions/function-v2/test2/0.2.1')
        .send({ code })
        .expect(200)
        .expect('content-type', /json/, done);
    });

    // patch fix for 0.1.1
    before((done) => {
      request(routes)
        .put('/v2/functions/function-v2/test2/0.1.2')
        .send({ code })
        .expect(200)
        .expect('content-type', /json/, done);
    });

    it('should return the code at latest version', (done) => {
      request(routes)
        .get('/functions/function-v2/test2')
        .expect(200)
        .expect('content-type', /json/)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.code).to.be.eql(code);
          expect(res.body.id).to.be.eql('test2');
          expect(res.body.version).to.be.eql('0.2.1');
          done();
        });
    });
  });

  describe('GET /v2/functions/:namespace/:id/:version', () => {
    let code;
    before((done) => {
      code = `
        function main(req, res) {
          res.send({ foo: 'bar' });
        }
      `;

      request(routes)
        .put('/v2/functions/functionv2-router-get/test2/0.0.1')
        .send({ code })
        .expect(200)
        .expect('content-type', /json/, done);
    });

    it('should get the code at the function', (done) => {
      request(routes)
        .get('/v2/functions/functionv2-router-get/test2/0.0.1')
        .expect(200)
        .expect('content-type', /json/)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.code).to.be.eql(code);
          expect(res.body.id).to.be.eql('test2');
          expect(res.body.version).to.be.eql('0.0.1');
          expect(res.body.hash).to.exists;
          done();
        });
    });
  });

  describe('GET /v2/functions/:namespace/:id/:version/run', () => {
    describe('simple run with json body', () => {
      before((done) => {
        const code = `
          function main(req, res) {
            res.send({ hey: req.method });
          }
        `;

        request(routes)
          .put('/v2/functions/functionv2-router-run/test2/0.0.1')
          .send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should runs the code and return properlly', (done) => {
        request(routes)
          .get('/v2/functions/functionv2-router-run/test2/0.0.1/run')
          .expect(200)
          .expect('content-type', /json/)
          .expect({ hey: 'GET' }, done);
      });
    });
  });

  describe('PUT /v2/functions/:namespace/:id/:version/run', () => {
    describe('simple run with json body', () => {
      before((done) => {
        const code = `
          function main(req, res) {
            res.send({ foo: 'bar' });
          }
        `;

        request(routes)
          .put('/v2/functions/functionv2-router-run/test1/0.0.1')
          .send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should runs the code and return properlly', (done) => {
        request(routes)
          .put('/v2/functions/functionv2-router-run/test1/0.0.1/run')
          .expect(200)
          .expect('content-type', /json/)
          .expect({ foo: 'bar' }, done);
      });
    });

    describe('500 status code', () => {
      before((done) => {
        const code = `
          function main(req, res) {
            res.internalServerError('My server is crashed');
          }
        `;

        request(routes)
          .put('/v2/functions/functionv2-router-run/test2/0.0.1')
          .send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should returns the status 500 with text plain content', (done) => {
        request(routes)
          .put('/v2/functions/functionv2-router-run/test2/0.0.1/run')
          .expect(500)
          .expect('content-type', /json/)
          .expect('{"error":"My server is crashed"}', done);
      });
    });

    describe('304 status code', () => {
      before((done) => {
        const code = `
          function main(req, res) {
            res.notModified();
          }
        `;

        request(routes)
          .put('/v2/functions/functionv2-router-run/test2/0.0.1')
          .send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should returns the status 500 with text plain content', (done) => {
        request(routes)
          .put('/v2/functions/functionv2-router-run/test2/0.0.1/run')
          .expect(304)
          .expect('', done);
      });
    });

    describe('body and query string to the code and combine then', () => {
      before((done) => {
        const code = `
          function main(req, res) {
            const query = req.query;
            const body = req.body;
            res.send({ query, body });
          }
        `;

        request(routes)
          .put('/v2/functions/functionv2-router-run/test3/0.0.1')
          .send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should returns the status 403 with text plain content', (done) => {
        const person = { name: 'John Doe' };

        request(routes)
          .put('/v2/functions/functionv2-router-run/test3/0.0.1/run?where[name]=John')
          .send({ person })
          .expect(200)
          .expect('content-type', /json/)
          .expect({
            body: { person },
            query: { where: { name: 'John' } },
          }, done);
      });
    });

    describe('require arbitrary library inside function', () => {
      before((done) => {
        const code = `
          const _ = require('lodash');
          const people = [{name: 'John'}, {name: 'Doe'}];
          function main(req, res) {
            const names = _.map(people, 'name');
            res.send({ names });
          }
        `;

        request(routes)
          .put('/v2/functions/functionv2-router-run/test4/0.0.1').send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should uses the arbitrary library properly', (done) => {
        request(routes)
          .put('/v2/functions/functionv2-router-run/test4/0.0.1/run')
          .expect(200)
          .expect('content-type', /json/)
          .expect({ names: ['John', 'Doe'] }, done);
      });
    });
  });
});
