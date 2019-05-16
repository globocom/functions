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

  sendLog(level, shortMessage, extra) {
    const message = Object.assign({
      level,
      short_message: shortMessage,
    }, config.log.fields, this.fields, extra);

    for (const gelfClient of this.gelfClients) {
      gelfClient.emit('gelf.log', message);
      log.info('log sent to gelfServer:', gelfClient.config.graylogHostname, 'message:', shortMessage);
    }
  }

  flush({ status, requestTime }) {
    let fullMessage = this.stream.buffer.join('');

    if (this.stream.truncated) {
      fullMessage += '\ntruncated';
    }

    const message = Object.assign({
      full_message: fullMessage,
      status,
      request_time: requestTime,
      group: this.namespace,
      file: this.file,
    }, this.fields);

    let level = 'info';
    if (status >= 500) {
      level = 'error';
    } else if (status >= 400) {
      level = 'warn';
    }
    const statusMsg = STATUS_CODES[status];

    this.sendLog(level, `Function "${this.file}" was executed with status ${status} "${statusMsg}"`, message);
    return message;
  }
}

exports.DefaultLogStorage = StdoutLogStorage;
exports.StdoutLogStorage = StdoutLogStorage;
exports.GelfLogStorage = GelfLogStorage;

if (config.log.type === 'gelf') {
  exports.DefaultLogStorage = GelfLogStorage;
}
