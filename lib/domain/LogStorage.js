const {
  PrefixLog,
  MemoryStream,
} = require('@globocom/backstage-functions-sandbox');

const { STATUS_CODES } = require('http');
const gelf = require('gelf-pro');
const config = require('../support/config');


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
    const gelfClientList = [];

    // support to old version of code. remove this when migrated.
    if (Array.isArray(config.log.host)) {
      for (let i = 0; i < config.log.host.lenght; i += 1) {
        const client = gelf.setConfig({
          fields: config.log.fields,
          adapterOptions: {
            host: config.log.host[i],
            port: config.log.port,
          },
        });
        gelfClientList.append(client);
      }
    } else {
      const client = gelf.setConfig({
        fields: config.log.fields,
        adapterOptions: {
          host: config.log.host,
          port: config.log.port,
        },
      });

      gelfClientList.append(client);
    }

    return gelfClientList;
  }

  sendLog({ level, message }) {
    for (let i = 0; i < this.gelfClients.length; i += 1) {
      const client = this.gelfClients[i];
      client[level](message);
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
