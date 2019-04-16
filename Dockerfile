FROM mhart/alpine-node:8.15.1
RUN apk add --no-cache make gcc g++ python
WORKDIR /application/functions
ADD lib lib
ADD package.json .
ADD npm-shrinkwrap.json .

RUN npm install
