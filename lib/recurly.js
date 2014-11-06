
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
var qs = require('node-querystring');
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

  if (options.publicKey) {
    this.config.publicKey = options.publicKey;
  } else {
    throw errors('missing-public-key');
  }

  if (options.api) {
    this.config.api = options.api;
  }

  if (options.currency) {
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

Recurly.prototype.open = require('./recurly/open');
Recurly.prototype.relay = require('./recurly/relay');
Recurly.prototype.coupon = require('./recurly/coupon');
Recurly.prototype.paypal = require('./recurly/paypal');
Recurly.prototype.plan = require('./recurly/plan');
Recurly.prototype.tax = require('./recurly/tax');
Recurly.prototype.token = require('./recurly/token');
Recurly.prototype.validate = require('./recurly/validate');
Recurly.prototype.Pricing = require('./recurly/pricing');
