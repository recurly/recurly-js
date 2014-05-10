
/*!
 * Module dependencies.
 */

var bind = require('bind');
var json = require('json');
var each = require('each');
var type = require('type');
var merge = require('merge');
var mixin = require('mixin');
var jsonp = require('jsonp');
var events = require('event');
var qs = require('querystring');
var Emitter = require('emitter');
var errors = require('./errors');
var version = require('./version');
var debug = require('debug')('recurly');

/**
 * Default configuration values.
 *
 * @private
 * @type {Object}
 */

var defaults = {
    currency: 'USD'
  , timeout: 60000
  , publicKey: ''
  , api: 'https://api.recurly.com/js/v1'
};

/**
 * API mixins.
 *
 * @type {Array}
 * @private
 */

var mixins = [
    'coupon'
  , 'paypal'
  , 'plan'
  , 'tax'
  , 'token'
  , 'pricing'
  , 'validate'
];

/**
 * Export `Recurly`.
 */

module.exports = Recurly;

/**
 * Initialize defaults.
 *
 * @param {Object} options
 * @constructor
 * @public
 */

function Recurly (options) {
  this.id = 0;
  this.version = version;
  this.configured = false;
  this.config = merge({}, defaults);
  if (options) this.configure(options);
}

/**
 * Inherits `Emitter`.
 */

Emitter(Recurly.prototype);

/**
 * Configure settings.
 *
 * @param {String|Object} options Either publicKey or object containing
 *                                publicKey and other optional members
 * @param {String} options.publicKey
 * @param {String} [options.currency]
 * @param {String} [options.api]
 * @public
 */

Recurly.prototype.configure = function configure (options) {
  if (this.configured) throw errors('already-configured');

  debug('configure');

  if (type(options) === 'string') options = { publicKey: options };

  if ('publicKey' in options) {
    this.config.publicKey = options.publicKey;
  } else {
    throw errors('missing-public-key');
  }

  if ('api' in options) {
    this.config.api = options.api;
  }

  if ('currency' in options) {
    this.config.currency = options.currency;
  }

  this.configured = true;
};

/**
 * Assembles the API endpoint.
 *
 * @return {String} route
 * @private
 */

Recurly.prototype.url = function url (route) {
  return this.config.api + route;
};

/**
 * Issues an API request.
 *
 * @param {String} route
 * @param {Object} [data]
 * @param {Function} done
 * @throws {Error} If `configure` has not been called.
 * @private
 */

Recurly.prototype.request = function request (route, data, done) {
  debug('request');

  if (false === this.configured) {
    throw errors('not-configured');
  }

  if ('function' == type(data)) {
    done = data;
    data = {};
  }

  var url = this.url(route);
  var timeout = this.config.timeout;

  data.version = this.version;
  data.key = this.config.publicKey;

  url += '?' + qs.stringify(data);

  this.cache(url, function (res, set) {
    if (res) return done(null, res);
    jsonp(url, { timeout: timeout }, function (err, res) {
      if (err) return done(err);
      if (res.error) {
        done(errors('api-error', res.error));
      } else {
        done(null, set(res));
      }
    });
  });
};

/**
 * Caches an object
 *
 * TODO: figure out invalidation & expiry
 *
 * @param {String} url
 * @param {Function} done
 * @private
 */
 
Recurly.prototype.cache = function cache (url, done) {
  debug('cache');
  var stored = localStorage.getItem(url);
  if (stored) {
    debug('cache found ' + url);
    return done(json.parse(stored));
  } else {
    debug('cache set ' + url);
    return done(null, set);
  }
  function set (obj) {
    // disabled for now
    // localStorage.setItem(url, json.stringify(obj));
    return obj;
  }
};

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

Recurly.prototype.open = function open (url, data, done) {
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

Recurly.prototype.relay = function relay (done) {
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
    frame.name = 'recurly-relay';
    frame.style.display = 'none';
    frame.onload = bind(this, done);
    document.body.appendChild(frame);
  } else {
    done();
  }
};

/**
 * Load the `mixins` onto Recurly.prototype.
 */

each(mixins, function (name) {
  mixin(Recurly.prototype, require('./mixins/' + name));
});
