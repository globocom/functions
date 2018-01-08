const raven = require('raven');
const request = require('request');
const https = require('https');
const { parseError } = require('raven/lib/parsers');
const { getModules, getCulprit } = require('raven/lib/utils');
const { https: ravenHTTPSTransport } = require('raven/lib/transports');
const config = require('../support/config');

const log = require('../support/log');

raven.config();
raven.disableConsoleAlerts();
const globalSentryDSNClient = new raven.Client();

ravenHTTPSTransport.agent = https.globalAgent;

function applyContext(frame, lines) {
  const linesOfContext = 7;
  const realLine = frame.lineno - 2;
  frame.pre_context = lines.slice(Math.max(0, realLine - (linesOfContext + 1)), realLine);
  frame.context_line = lines[realLine];
  frame.post_context = lines.slice(realLine + 1, realLine + linesOfContext);
}

function getSandboxModules() {
  const modules = {};
  const hostModules = getModules();

  for (const module of config.defaultGlobalModules) {
    modules[module] = hostModules[module];
  }
  return modules;
}

function notifySentryGlobal(ctx) {
  if (!raven.dsn) {
    log.info('Does not have global sentry');
    return;
  }
  ctx.event_id = raven.generateEventId();
  raven.send(ctx, (publishErr) => {
    if (publishErr) {
      log.error('Failed to publish error into global sentry: %s', publishErr.message);
      return;
    }

    log.info('Published in global sentry');
  });
}

function filterFrames(ctx, filename, code) {
  const lines = code.split('\n');

  for (const exception of ctx.exception) {
    const frames = exception.stacktrace.frames.filter((frame) => {
      if (frame.filename !== filename) {
        return false;
      }
      applyContext(frame, lines);

      if (!frame.context_line) {
        return false;
      }

      frame.in_app = true;
      return true;
    });

    if (frames.length > 0) {
      ctx.culprit = `${filename}: ${getCulprit(frames[frames.length - 1])}`;
    } else {
      ctx.culprit = filename;
    }

    exception.stacktrace.frames = frames;
  }

  ctx.message = `${filename}: ${ctx.message}`;
}

function filterStatusCode(statusCode) {
  return statusCode !== 408 && statusCode < 500;
}

class ErrorTracker {
  constructor({ sentryDSN, filename, extra, tags, code, breadcrumbs, sentryClient }) {
    this.sentryDSN = sentryDSN;
    this.filename = filename;
    this.extra = extra;
    this.code = code;

    this.tags = tags;
    this.breadcrumbs = breadcrumbs || [];
    this.sentryClient = sentryClient || globalSentryDSNClient;
  }

  notify(err) {
    if (err.statusCode && filterStatusCode(err.statusCode)) {
      return;
    }

    parseError(err, { extra: this.extra, tags: this.tags }, (ctx) => {
      filterFrames(ctx, this.filename, this.code);

      ctx.timestamp = new Date().toISOString().split('.')[0];
      ctx.breadcrumbs = { values: this.breadcrumbs };
      ctx.modules = getSandboxModules();

      if (this.sentryDSN) {
        this.sentryClient.config(this.sentryDSN);
        ctx.event_id = this.sentryClient.generateEventId();
        this.sentryClient.send(ctx, (publishErr) => {
          if (publishErr) {
            log.error('Failed to publish error into sentry: %s', publishErr.message);
          }
        });
      }

      notifySentryGlobal(ctx);
    });
  }

  static get name() {
    return 'Sentry';
  }

  static async ping() {
    const dsn = globalSentryDSNClient.dsn;

    if (!dsn) {
      return 'SENTRY_DSN is not setted yet';
    }

    const url = `${dsn.protocol}://${dsn.host}/api/0/`;

    return new Promise((resolve, reject) => {
      request({
        url,
        timeout: 3000,
      }, (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        if (response.statusCode === 200) {
          resolve('OK');
          return;
        }

        reject(new Error(`HTTP status: ${response.statusCode} requesting sentry`));
      });
    });
  }
}

module.exports = ErrorTracker;
