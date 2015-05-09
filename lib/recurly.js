
/*!
 * Module dependencies.
 */

var bind = require('bind');
var json = require('json');
var each = require('each');
var type = require('type');
var json = require('json');
var merge = require('merge');
var mixin = require('mixin');
var jsonp = require('jsonp');
var qs = require('node-querystring');
var XHR = require('cors-xhr');
var Emitter = require('emitter');
var errors = require('./errors');
var version = require('./version');
var debug = require('debug')('recurly');

var bankAccount = require('./recurly/bank-account');

/**
 * Default configuration values.
 *
 * currency: ISO 4217
 * timeout: API request timeout in ms
 * publicKey: Recurly site public key
 * cors: Whether to use XHR2/XDR+CORS over jsonp for API requests
 * api: URL of API
 *
 * @private
 * @type {Object}
 */

var defaults = {
  currency: 'USD',
  timeout: 60000,
  publicKey: '',
  cors: false,
  api: 'https://api.recurly.com/js/v1'
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

  this.bankAccount = {
    token: bind(this, bankAccount.token),
    bankInfo: bind(this, bankAccount.bankInfo)
  };
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

Recurly.prototype.configure = function (options) {
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

  if (options.cors) {
    this.config.cors = options.cors;
  }

  if (options.currency) {
    this.config.currency = options.currency;
  }

  this.config.required = options.required || [];

  this.configured = true;
};

/**
 * Assembles the API endpoint.
 *
 * @return {String} route
 * @private
 */

Recurly.prototype.url = function (route) {
  return this.config.api + route;
};

/**
 * Issues an API request.
 *
 * @param {String} method
 * @param {String} route
 * @param {Object} [data]
 * @param {Function} done
 * @throws {Error} If `configure` has not been called.
 * @private
 */

Recurly.prototype.request = function (method, route, data, done) {
  debug('request');

  if (false === this.configured) {
    throw errors('not-configured');
  }

  if ('function' == type(data)) {
    done = data;
    data = {};
  }

  data.version = this.version;
  data.key = this.config.publicKey;

  if (this.config.cors) {
    return this.xhr(method, route, data, done);
  } else {
    return this.jsonp(route, data, done);
  }
};

/**
 * Issues an API request over xhr.
 *
 * @param {String} method
 * @param {String} route
 * @param {Object} [data]
 * @param {Function} done
 * @private
 */

Recurly.prototype.xhr = function (method, route, data, done) {
  debug('xhr');

  var req = new XHR;
  var url = this.url(route);
  var payload = qs.stringify(data);

  if (method === 'get') {
    url += '?' + payload;
  }

  req.open(method, url);
  req.timeout = this.config.timeout;
  req.ontimeout = function () {
    done(errors('api-timeout'));
  };
  req.onerror = function () {
    done(errors('api-error'));
  };
  req.onprogress = function () {};
  req.onload = function () {
    try {
      var res = json.parse(this.responseText);
    } catch (e) {
      debug(this.responseText, e);
      return done(errors('api-error', { message: 'There was a problem parsing the API response.' }));
    }

    if (res && res.error) {
      done(errors('api-error', res.error));
    } else {
      done(null, res);
    }
  };

  // XDR requests will abort if too many are sent simultaneously
  setTimeout(send, 0);

  function send () {
    if (method === 'post') {
      // XDR cannot set Content-type
      if (req.setRequestHeader) {
        req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      }
      req.send(payload);
    } else {
      req.send();
    }
  }
};

/**
 * Issues an API request over jsonp.
 *
 * @param {String} route
 * @param {Object} [data]
 * @param {Function} done
 * @private
 */

Recurly.prototype.jsonp = function (route, data, done) {
  debug('jsonp');

  var url = this.url(route) + '?' + qs.stringify(data);

  jsonp(url, { timeout: this.config.timeout, prefix: '__rjs' }, function (err, res) {
    if (err) return done(err);
    if (res.error) {
      done(errors('api-error', res.error));
    } else {
      done(null, res);
    }
  });
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
