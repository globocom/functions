const Logger = require('winston').Logger;
const Console = require('winston').transports.Console;

const logLevel = process.env['LOG_LEVEL'] || 'info';

var logger = new Logger({
    transports: [
        new Console({
            colorize: true,
            label: process.pid,
            level: logLevel,
            timestamp: false
        })
    ]
});

module.exports = logger;
