const dgram = require('dgram');
const config = require('../support/config');
const log = require('../support/log');

const sender = dgram.createSocket('udp4');


class Metric {
  constructor(metric) {
    this.metric = metric;
    this.start = Date.now();
  }

  finish(options) {
    if (!config.metric.client) {
      return;
    }

    const spent = Date.now() - this.start;
    const buf = JSON.stringify(Object.assign({
      client: config.metric.client,
      metric: this.metric,
      time: spent,
    }, options || {}));

    sender.send(buf, config.metric.udpPort, config.metric.udpHost, (err) => {
      if (err) {
        log.error('Failed to sent udp metric: %s', err.message);
      }
    });
  }
}

module.exports = Metric;
