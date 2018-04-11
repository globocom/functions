const request = require('supertest');
const expect = require('chai').expect;
const routes = require('../../../../../lib/http/routes');

describe('FunctionRouter integration', () => {
  describe('PUT /functions/:namespace/:id', () => {
    describe('when code is correct', () => {
      const code = `
        function main(req, res) {
          res.send({ foo: 'bar' });
        }
      `;

      it('should put the code at the function', (done) => {
        request(routes)
          .put('/functions/function-router-test/test1')
          .send({ code })
          .expect('content-type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            }
            expect(res.body.code).to.be.eql(code);
            expect(res.body.id).to.be.eql('test1');
            done();
          });
      });
    });
  });

  describe('GET /functions/:namespace/:id', () => {
    let code;
    before((done) => {
      code = `
        function main(req, res) {
          res.send({ foo: 'bar' });
        }
      `;

      request(routes)
        .put('/functions/function-router-get/test2')
        .send({ code })
        .expect(200)
        .expect('content-type', /json/, done);
    });

    it('should put the code at the function', (done) => {
      request(routes)
        .get('/functions/function-router-get/test2')
        .expect(200)
        .expect('content-type', /json/)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.code).to.be.eql(code);
          expect(res.body.id).to.be.eql('test2');
          expect(res.body.hash).to.exists;
          done();
        });
    });
  });

  describe('GET /functions/:namespace/:id/run', () => {
    describe('simple run with json body', () => {
      before((done) => {
        const code = `
          function main(req, res) {
            res.send({ hey: req.method });
          }
        `;

        request(routes)
          .put('/functions/function-router-run/test2')
          .send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should runs the code and return properlly', (done) => {
        request(routes)
          .get('/functions/function-router-run/test2/run')
          .expect(200)
          .expect('content-type', /json/)
          .expect({ hey: 'GET' }, done);
      });
    });
  });

  describe('PUT /functions/:namespace/:id/run', () => {
    describe('simple run with json body', () => {
      before((done) => {
        const code = `
          function main(req, res) {
            res.send({ foo: 'bar' });
          }
        `;

        request(routes)
          .put('/functions/function-router-run/test1')
          .send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should runs the code and return properlly', (done) => {
        request(routes)
          .put('/functions/function-router-run/test1/run')
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
          .put('/functions/function-router-run/test2')
          .send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should returns the status 500 with text plain content', (done) => {
        request(routes)
          .put('/functions/function-router-run/test2/run')
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
          .put('/functions/function-router-run/test2')
          .send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should returns the status 500 with text plain content', (done) => {
        request(routes)
          .put('/functions/function-router-run/test2/run')
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
          .put('/functions/function-router-run/test3')
          .send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should returns the status 403 with text plain content', (done) => {
        const person = { name: 'John Doe' };

        request(routes)
          .put('/functions/function-router-run/test3/run?where[name]=John')
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
          .put('/functions/function-router-run/test4').send({ code })
          .expect(200)
          .expect('content-type', /json/, done);
      });

      it('should uses the arbitrary library properly', (done) => {
        request(routes)
          .put('/functions/function-router-run/test4/run')
          .expect(200)
          .expect('content-type', /json/)
          .expect({ names: ['John', 'Doe'] }, done);
      });
    });
  });
});
