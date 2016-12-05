const Logger = require('winston').Logger;
const Console = require('winston').transports.Console;
const config = require('./config');

const logLevel = process.env.LOG_LEVEL || 'info';
let logLabel = process.pid;

if (config.numCPUs === 1) {
  logLabel = undefined;
}

const logger = new Logger({
  transports: [
    new Console({
      colorize: true,
      label: logLabel,
      level: logLevel,
      timestamp: false,
    }),
  ],
});

module.exports = logger;
