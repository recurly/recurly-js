
/*!
 * Module dependencies.
 */

var bind = require('bind');
var json = require('json');
var events = require('event');
var errors = require('../errors');
var debug = require('debug')('recurly:relay');

/**
 * expose
 */

module.exports = relay;

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

function relay (done) {
  var self = this;

  debug('relay');

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
}
