// adapted from: https://github.com/wavded/graygelf/blob/master/server.js
/* eslint no-plusplus: "off" */
const zlib = require('zlib');
const dgram = require('dgram');
const Stream = require('stream');

class GrayGelfServer extends Stream {

  constructor() {
    super();
    this.pendingChunks = Object.create(null);
    this.readable = true;
  }
  checkError(err) {
    this.emit('error', err);
  }

  listen(port, address) {
    if (this.udf) {
      throw new Error('GrayGelf is already listening on a port');
    }

    this.port = port || 12201;
    this.address = address || '0.0.0.0';

    this.udf = dgram.createSocket('udp4');
    this.udf.on('error', this.checkError.bind(this));
    this.udf.on('message', this.message.bind(this));
    this.udf.bind(this.port, this.address);

    // clean incomplete chunked messages
    this.chunkInterval = setInterval(this.checkExpired.bind(this), 60000);
    return this;
  }

  unref() {
    this.udf.unref();
    this.chunkInterval.unref();
    return this;
  }

  close() {
    this.udf.close();
    this.udf = null;
    clearInterval(this.chunkInterval);
  }

  checkExpired() {
    const now = Date.now();
    for (const id of Object.keys(this.pendingChunks)) {
      if (now - this.pendingChunks[id].lastReceived >= 60000) {
        delete this.pendingChunks[id];
      }
    }
  }

  handleChunk(chunk) {
    const id = chunk.toString('ascii', 2, 8);
    const index = chunk[10];
    let total = chunk[11];

    const chunks = this.pendingChunks[id] || { data: [] };
    chunks.data[index] = chunk.slice(12); // store without chunk header
    chunks.lastReceived = Date.now();

    this.pendingChunks[id] = chunks;

    if (chunks.data.length === total) {
      // last index has been filled
      while (total--) {
        if (!Buffer.isBuffer(chunks.data[total])) {
          return; // make sure the array is filled
        }
      }
      this.message(Buffer.concat(chunks.data)); // create complete buffer
      delete this.pendingChunks[id];
    }
  }

  message(buf, details) {
    if (details) {
      this.emit('data', buf); // from udp.on('message')
    }

    switch (buf[0]) {
      case 0x78: // zlib (deflate) message
        zlib.inflate(buf, this.broadcast.bind(this));
        break;
      case 0x1f: // gzip message
        zlib.gunzip(buf, this.broadcast.bind(this));
        break;
      case 0x1e: // chunked message
        this.handleChunk(buf);
        break;
      default:   // unknown message
    }
  }

  broadcast(err, buf) {
    /* istanbul ignore next */
    if (err) {
      this.emit('error', err);
      return;
    }

    const data = JSON.parse(buf.toString());
    this.emit('message', data);
  }
}

module.exports = GrayGelfServer;
