[![Build Status](https://travis-ci.org/backstage/functions.png?branch=master)](https://travis-ci.org/backstage/functions)
[![Coverage Status](https://coveralls.io/repos/github/backstage/functions/badge.svg?branch=master)](https://coveralls.io/github/backstage/functions?branch=master)


# Backstage Functions!
Beat your code for you with precision!

## Requirements

- Redis 3.0+
- NodeJS 6.6.0

## Setup

    make setup

## Run local

    make run

# Examples

## Create function

```javascript
function main(req, res) {
  const name = (req.body && req.body.name) || "World"
  res.send({ say: `Hello ${name}!` })
}
```

Send the function as curl to `/functions/:namespace/:name`

`curl -XPUT localhost:8100/functions/example/hello-world -d '{"code":"function main(req, res) {\n  const name = (req.body && req.body.name) || \"World\"\n  res.send({ say: `Hello ${name}!` })\n}\n"}' -H 'content-type: application/json'`

Run the function send a -XPUT to `/functions/:namespace/:name/run`

```bash
curl -XPUT localhost:8100/functions/example/hello-world/run  -H 'content-type: application/json'
# { "say": "Hello World" }
```

If one pass an object at the request payload with name the payload is executed

```bash
curl -XPUT localhost:8100/functions/example/hello-world/run  -H 'content-type: application/json' -d '{"name": "John"}'
# { "say": "Hello John" }
```
