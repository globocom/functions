FROM mhart/alpine-node:6.9.4

RUN apk add --no-cache make gcc g++ python
WORKDIR /application/functions
ADD lib lib
ADD package.json .
ADD npm-shrinkwrap.json .

RUN npm install

EXPOSE 8100
CMD ["node", "lib/app.js"]
