[![Build Status](https://travis-ci.org/backstage/functions.png?branch=master)](https://travis-ci.org/backstage/functions)
[![Coverage Status](https://coveralls.io/repos/github/backstage/functions/badge.svg?branch=master)](https://coveralls.io/github/backstage/functions?branch=master)


# Backstage Functions

Backstage Functions is an Open Source [Serverless](http://martinfowler.com/articles/serverless.html) Plataform able to store and execute JavaScript code.

## Run local via Docker
### Requirements

- Docker 1.12+
- Docker compose 1.8+

### Download docker-compose.yml

```bash
mkdir functions
cd functions
curl 'https://raw.githubusercontent.com/backstage/functions/master/docker-compose.yml' > docker-compose.yml
```

### Run

```bash
docker-compose up
```

## Run local without Docker
### Requirements

- Redis 3.0+
- NodeJS 6.9.1

### Download the project

```bash
git clone https://github.com/backstage/functions.git
cd functions
```

### Setup

```bash
make setup
```

### Run

```bash
make run
```

## How to use

### Create function

```javascript
function main(req, res) {
  const name = (req.body && req.body.name) || "World"
  res.send({ say: `Hello ${name}!` })
}
```

Send the function as curl to `/functions/:namespace/:name`

```bash
curl -i -XPUT http://localhost:8100/functions/example/hello-world \
    -H 'content-type: application/json' \
    -d '{"code":"function main(req, res) {\n  const name = (req.body && req.body.name) || \"World\"\n  res.send({ say: `Hello ${name}!` })\n}\n"}'
```

Run the function send a `PUT` request to `/functions/:namespace/:name/run`:

```bash
curl -i -H 'content-type: application/json' -XPUT http://localhost:8100/functions/example/hello-world/run
```

Results in something like:

```bash
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 22
ETag: W/"16-soBGetwJPBLt8CqWpBQu+A"
Date: Tue, 11 Oct 2016 16:51:04 GMT
Connection: keep-alive

{"say":"Hello World!"}
```

If one pass an object at the request payload with name the payload is executed

```bash
curl -i -XPUT http://localhost:8100/functions/example/hello-world/run \
    -H 'content-type: application/json' \
    -d '{"name": "Pedro"}'
```

Results in something like:

```bash
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 22
ETag: W/"16-Ino2/umXaZ3xVEhoqyS8aA"
Date: Tue, 11 Oct 2016 17:13:11 GMT
Connection: keep-alive

{"say":"Hello Pedro!"}
```