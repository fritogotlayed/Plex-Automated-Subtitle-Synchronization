const _ = require('lodash');
const got = require('got');

const nameFromLevel = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
};

/**
 * Constructs a new logger object that emits events to Logstash via HTTP or HTTPS
 *
 * @param {Object} options An object to override settings of the logger.
 * @param {String} options.loggingEndpoint The logstash host that will handle events via HTTP/HTTPS.
 * @param {Object} options.metadata The base set of metadata to send with every log message.
 */
function BunyanLogstashHttp(options, error) {
  const defaults = {
    loggingEndpoint: 'http://127.0.0.1:5002',
  };
  const settings = _.merge({}, defaults, options);

  this.customFormatter = options.customFormatter;
  this.error = error || function err() {};

  this._settings = settings;
}

BunyanLogstashHttp.prototype._postMessage = function _postMessage(message) {
  const url = this._settings.loggingEndpoint;
  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
    throwHttpErrors: false,
    body: JSON.stringify(message),
  };

  return got.post(url, options)
    .then((resp) => {
      switch (resp.statusCode) {
        case 200:
          return Promise.resolve();
        default:
          return Promise.reject();
      }
    });
};

BunyanLogstashHttp.prototype._log = function _log(level, message, metadata) {
  let meta;
  if (this._settings.metadata || metadata) {
    meta = _.merge({}, this._settings.metadata, metadata);
  }
  const timestamp = metadata.time;
  this._postMessage({
    '@timestamp': timestamp,
    logLevel: level,
    message,
    ...meta,
  });
};

BunyanLogstashHttp.prototype.write = function write(record) {
  const self = this;
  let rec = record;
  let message;

  if (typeof rec === 'string') {
    rec = JSON.parse(rec);
  }

  const levelName = nameFromLevel[rec.level];

  try {
    message = self.customFormatter
      ? self.customFormatter(rec, levelName)
      : { msg: rec.msg };
  } catch (err) {
    return self.error(err);
  }

  const meta = _.merge({}, rec, message);
  delete meta.msg;
  return self._log(levelName, message.msg, meta);
};

module.exports = BunyanLogstashHttp;