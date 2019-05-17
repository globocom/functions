const {
  PrefixLog,
  MemoryStream,
} = require('@globocom/backstage-functions-sandbox');

const { STATUS_CODES } = require('http');
const Gelf = require('gelf');
const config = require('../support/config');
const log = require('../support/log');

function extractHTTPFields(req) {
  const fields = {};
  for (const fieldName of Object.keys(config.log.fieldsFromHTTPHeaders)) {
    const headerName = config.log.fieldsFromHTTPHeaders[fieldName];
    fields[fieldName] = req.headers[headerName];
  }
  return fields;
}

class StdoutLogStorage {
  /* eslint class-methods-use-this: ["error", { "exceptMethods": ["flush"] }] */
  constructor(namespace, id) {
    this.console = new PrefixLog(`namespace:${namespace}, id:${id}`);
  }

  flush() {}
}

class GelfLogStorage {
  constructor(namespace, id, req) {
    this.stream = new MemoryStream(config.log.maxFullMessage);
    this.console = new PrefixLog(null, this.stream, this.stream);
    this.file = `${namespace}/${id}.js`;
    this.namespace = namespace;
    this.fields = extractHTTPFields(req);
    this.gelfClients = GelfLogStorage.prepareGelfClients();
    this.logLevels = {
      emerg: 0,
      panic: 0,
      alert: 1,
      crit: 2,
      error: 3,
      err: 3,
      warn: 4,
      warning: 4,
      notice: 5,
      info: 6,
      debug: 7,
    };
  }

  static prepareGelfClients() {
    let client;
    const gelfClientList = [];

    for (const host of config.log.hosts) {
      client = new Gelf({
        graylogHostname: host,
        graylogPort: config.log.port,
        connection: 'wan',
        maxChunkSizeWan: 1420,
      });

      client.on('error', (err) => {
        log.error('Failed to send log graylogServer err: %s', err);
      });

      gelfClientList.push(client);
    }

    return gelfClientList;
  }

  static prepareExtraFields(extra) {
    const auxObject = {};

    Object.keys(extra).forEach((key) => {
      if (key.startsWith('_')) {
        auxObject[key] = extra[key];
      } else {
        const keyName = `_${key}`;
        auxObject[keyName] = extra[key];
      }
    });

    return auxObject;
  }

  sendLog(message) {
    for (const gelfClient of this.gelfClients) {
      gelfClient.emit('gelf.log', message);
      log.debug('sent to gelfServer:', gelfClient.config.graylogHostname, 'message:', message);
    }
  }

  flush({ status, requestTime }) {
    let fullMessage = this.stream.buffer.join('');

    if (this.stream.truncated) {
      fullMessage += '\ntruncated';
    }

    let level = 'info';
    if (status >= 500) {
      level = 'error';
    } else if (status >= 400) {
      level = 'warn';
    }
    const statusMsg = STATUS_CODES[status];
    const shortMessage = `Function "${this.file}" was executed with status ${status} "${statusMsg}"`;

    const extra = Object.assign({
      status,
      request_time: requestTime,
      group: this.namespace,
      file: this.file,
    }, this.fields);

    const message = Object.assign({
      full_message: fullMessage,
      level: this.logLevels[level],
      short_message: shortMessage,
    }, config.log.fields, GelfLogStorage.prepareExtraFields(extra));

    this.sendLog(message);
    return message;
  }
}

exports.DefaultLogStorage = StdoutLogStorage;
exports.StdoutLogStorage = StdoutLogStorage;
exports.GelfLogStorage = GelfLogStorage;

if (config.log.type === 'gelf') {
  exports.DefaultLogStorage = GelfLogStorage;
}
