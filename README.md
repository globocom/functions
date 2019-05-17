[![Build Status](https://travis-ci.org/backstage/functions.png?branch=master)](https://travis-ci.org/backstage/functions) [![Coverage Status](https://coveralls.io/repos/github/backstage/functions/badge.svg?branch=master)](https://coveralls.io/github/backstage/functions?branch=master)

# Backstage Functions
Backstage Functions is an Open Source [Serverless](http://martinfowler.com/articles/serverless.html) Platform able to store and execute code.

## Benefits
- Your code will be executed in an isolated environment
- You don't have to worry about infrastructure
- Functions can be called at any time by any project

## FAQ
- **Which languages are supported?**
Currently, only Javascript.

- **Is it based on events?**
Not yet.

- **How the code execution happens in an isolated way?**
It uses the [Backstage Functions Sandbox](https://github.com/backstage/functions-sandbox).

## Running locally without Docker
### Requirements
- Redis 3.0+
- NodeJS 8.9.1


### Setup
```bash
make setup
```

### Run
```bash
make run
```

### Test
```bash
make test
```

## Running locally via Docker
### Requirements
- Docker 1.12+
- Docker compose 1.8+


### Setup
```bash
make docker_build
```

### Run
```bash
make rund
```

### Test
```bash
make testd
```

### Function Structure
Your function will have a file, which you define any name you want, and it has to have a function called `main`, with two parameters: `req` and `res`. Req represents the `Request` and Res represents the `Response`.
At the end of your code, you'll have to use the `send` method.

#### Example of a function
```javascript
function main(req, res) {
  const name = (req.body && req.body.name) || "World"
  res.send({ say: `Hello ${name}!` })
}
```
### Setting a function

To set your function, you can make a `PUT` request to `/functions/:namespace/:name`:
```bash
curl -i -X PUT http://localhost:8100/functions/example/hello-world \
    -H 'content-type: application/json' \
    -d '{"code":"function main(req, res) {\n  const name = (req.body && req.body.name) || \"World\"\n  res.send({ say: `Hello ${name}! Nice meeting you...` })\n}\n"}'
```

*Ps: if it doesn't exists, it will be created*

### Deleting a function
To delete your function, you can make a `DELETE` request to `/functions/:namespace/:name`:
```bash
curl -i -X DELETE http://localhost:8100/functions/example/hello-world \
    -H 'content-type: application/json'
```

### Executing a function
To execute a function, you can make a `PUT` request to `/functions/:namespace/:name/run`:
```bash
curl -i -X PUT http://localhost:8100/functions/example/hello-world/run \
    -H 'content-type: application/json'
```

The result will be something like:
```bash
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 22
ETag: W/"16-soBGetwJPBLt8CqWpBQu+A"
Date: Tue, 11 Oct 2016 16:51:04 GMT
Connection: keep-alive

{"say":"Hello World! Nice meeting you..."}
```

If one needs to pass an object in the request, the payload is executed:
```bash
curl -i -X PUT http://localhost:8100/functions/example/hello-world/run \
    -H 'content-type: application/json' \
    -d '{"name": "Pedro"}'
```

The result will be something like:
```bash
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 22
ETag: W/"16-Ino2/umXaZ3xVEhoqyS8aA"
Date: Tue, 11 Oct 2016 17:13:11 GMT
Connection: keep-alive

{"say":"Hello Pedro! Nice meeting you..."}
```

### Executing functions in a pipeline

To execute many functions in a pipeline, you can make a `PUT` request to `/functions/pipeline`:
```javascript
// Function0
function main(req, res) {
  res.send({x: req.body.x * 10});
}

// Function1
function main(req, res) {
  res.send({x: req.body.x * 20});
}
```

```bash
curl -g -i -X PUT 'http://localhost:8100/functions/pipeline?steps[0]=namespace/function0&steps[1]=namespace/function1' \
    -H 'content-type: application/json' -d '{"x": 1}'
```

Considering the curl above, the pipeline result would be like this:

```bash
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 22
ETag: W/"16-Ino2/umXaZ3xVEhoqyS8aA"
Date: Tue, 11 Oct 2016 17:13:11 GMT
Connection: keep-alive

{"x": 200}
```
