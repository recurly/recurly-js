var bind = require('component-bind');
var events = require('component-event');
var errors = require('../errors');
var debug = require('debug')('recurly:relay');

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

  self.origin = function () {
    var parser = document.createElement('a');
    parser.href = self.config.api;
    
    if (parser.origin) {
      return parser.origin;
    }
    
    // IE11 seems to append :443 to parser.host even when it's not there
    if (parser.protocol === 'https:' && parser.port == 443) {
      return parser.protocol+'//'+parser.hostname;
    }
    
    return parser.protocol+'//'+parser.host;
  };

  events.bind(window, 'message', function listener (event) {
    if (event.origin !== self.origin()) return;

    var data = JSON.parse(event.data);
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
