/*jshint -W058 */

const partial = require('lodash.partial');
const bind = require('component-bind');
const type = require('component-type');
const merge = require('merge');
const jsonp = require('jsonp');
const qs = require('qs');
const Emitter = require('component-emitter');
const errors = require('./errors');
const version = require('./version');
const debug = require('debug')('recurly');

const Bus = require('./recurly/bus').Bus;
const bankAccount = require('./recurly/bank-account');

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

const defaults = {
  currency: 'USD',
  timeout: 60000,
  publicKey: '',
  cors: false,
  api: 'https://api.recurly.com/js/v1'
};

/**
 * Initialize defaults.
 *
 * @param {Object} options
 * @constructor
 * @public
 */

export class Recurly extends Emitter {
  constructor (options) {
    super();
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
   * Configure settings.
   *
   * @param {String|Object} options Either publicKey or object containing
   *                                publicKey and other optional members
   * @param {String} options.publicKey
   * @param {String} [options.currency] sets a default currency
   * @param {String} [options.api]
   * @param {Boolean} [options.cors] Enables data transmission over XHR+CORS
   * @param {Array} [options.required] Adds additional field requirements for
   *                                   tokenization. ex: ['cvv']
   * @public
   */

  configure (options) {
    if (this.configured) throw errors('already-configured');

    debug('configure');

    if (type(options) === 'string') options = { publicKey: options };

    if (options.publicKey) {
      this.config.publicKey = options.publicKey;
    } else {
      throw errors('config-missing-public-key');
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

    // This must go last as it passes the finalized config
    if (type(options.fields) === 'object') {
      this.parent(options);
    } else {
      // TODO: This must be thrown on the parent, but not invoked when called from
      //       a hosted field. Need a flag to indicate we are operating as a hosted field..
      //
      // throw errors('config-missing-fields');
    }

    this.configured = true;
  };

  /**
   * Initialize the parent recurly instance concerns: hosted fields and message bus
   *
   * @private
   */

  parent (options) {
    this.hostedFields = new this.HostedFields({
      recurly: this.config,
      fields: options.fields,
      style: options.style
    });
    this.bus = new Bus;
    this.bus.add(this);
    this.bus.add(this.hostedFields);
    this.hostedFields.fields.forEach(hf => {
      this.bus.add(hf);
      this.bus.add(hf.window);
    });
    this.hostedFields.once('hostedFields:ready', partial(this.bus.send, 'hostedFields:ready'));
  };

  /**
   * Assembles the API endpoint.
   *
   * @return {String} route
   * @private
   */

  url (route) {
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

  request (method, route, data, done) {
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

  xhr (method, route, data, done) {
    debug('xhr');

    const XHR = (function () {
      const XHR = window.XMLHttpRequest;
      const XDM = window.XDomainRequest;
      if (XHR && 'withCredentials' in new XHR) return XHR;
      if (XDM) return XDM;
    })();

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
      var res;

      try {
        res = JSON.parse(this.responseText);
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

  jsonp (route, data, done) {
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
}

Recurly.prototype.open = require('./recurly/open');
Recurly.prototype.relay = require('./recurly/relay');
Recurly.prototype.coupon = require('./recurly/coupon');
Recurly.prototype.paypal = require('./recurly/paypal');
Recurly.prototype.plan = require('./recurly/plan');
Recurly.prototype.tax = require('./recurly/tax');
Recurly.prototype.token = require('./recurly/token');
Recurly.prototype.validate = require('./recurly/validate');
Recurly.prototype.Pricing = require('./recurly/pricing');
Recurly.prototype.HostedFields = require('./recurly/hosted-fields').HostedFields;
Recurly.prototype.Message = require('./recurly/message').Message;
