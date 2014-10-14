
/*!
 * Module dependencies.
 */

var bind = require('bind');
var type = require('type');
var json = require('json');
var events = require('event');
var qs = require('querystring');
var errors = require('../errors');
var debug = require('debug')('recurly:open');

/**
 * expose
 */

module.exports = open;

/**
 * Issues an API request to a popup window.
 *
 * TODO(*): configurable window name?
 * TODO(*): configurable window properties?
 *
 * @param {String} url
 * @param {Object} [data]
 * @param {Function} [done]
 * @throws {Error} If `configure` has not been called.
 * @return {Window}
 * @private
 */

function open (url, data, done) {
  debug('open');
  
  if (false === this.configured) {
    throw errors('not-configured');
  }

  if ('function' == type(data)) {
    done = data;
    data = {};
  }

  data = data || {};
  data.version = this.version;
  data.event = 'recurly-open-' + this.id++;
  data.key = this.config.publicKey;
  this.once(data.event, done);

  if (!/^https?:\/\//.test(url)) url = this.url(url);
  url += (~url.indexOf('?') ? '&' : '?') + qs.stringify(data);

  this.relay(function () {
    window.open(url);
  });
};

/**
 * Relay mixin.
 *
 * Inspects the window for intent to relay a message,
 * then attempts to send it off. closes the window once
 * dispatched.
 *
 * @param {Function} done
 * @private
 */

exports.relay = function (done) {
  var self = this;

  if (false === this.configured) {
    throw errors('not-configured');
  }

  events.bind(window, 'message', function listener (event) {
    var data = json.parse(event.data);
    var name = data.recurly_event;
    var body = data.recurly_message;
    var err = body.error ? errors('api-error', body.error) : null;
    events.unbind(window, 'message', listener);
    if (name) self.emit(name, err, body);
    if (frame) document.body.removeChild(frame);
  });

  if ('documentMode' in document) {
    var frame = document.createElement('iframe');
    frame.width = frame.height = 0;
    frame.src = this.url('/relay');
    frame.name = 'recurly_relay';
    frame.style.display = 'none';
    frame.onload = bind(this, done);
    document.body.appendChild(frame);
  } else {
    done();
  }
};
