FROM node:20.9.0-alpine
RUN apk add --no-cache make gcc g++ python3
WORKDIR /application/functions
ADD . .
RUN npm install
