const { Console } = require('console');
const { Writable } = require('stream');

class SpanConsoleStream extends Writable {
  constructor(level, console, span) {
    super();
    this.level = level;
    this.console = console;
    this.span = span;
  }

  _write(chunk, encoding, done) {
    const message = chunk.toString().trim();
    this.console[this.level](message);
    this.span.log({ level: this.level, message });
    done();
  }
}


class SpanConsoleWrapper extends Console {
  constructor(console, span) {
    super(
      new SpanConsoleStream('info', console, span),
      new SpanConsoleStream('error', console, span),
    );
  }
}

module.exports = SpanConsoleWrapper;
