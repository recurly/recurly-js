/*jshint -W058 */

import type from 'component-type';
import clone from 'component-clone';
import merge from 'lodash.merge';
import jsonp from 'jsonp';
import qs from 'qs';
import Emitter from 'component-emitter';
import errors from './errors';
import version from './version';
import bankAccount from './recurly/bank-account';
import {factory as Frame} from './recurly/frame';
import {factory as ApplePay} from './recurly/apple-pay';
import {factory as PayPal} from './recurly/paypal';
import {factory as Adyen} from './recurly/adyen';
import {deprecated as deprecatedPaypal} from './recurly/paypal/strategy/direct';
import {Bus} from './recurly/bus';
import {Fraud} from './recurly/fraud';
import {HostedFields, FIELD_TYPES} from './recurly/hosted-fields';
import {Message} from './recurly/message';
import {uuid} from './util/uuid';
import Pricing from './recurly/pricing';

import giftcard from './recurly/giftcard';

const debug = require('debug')('recurly');

/**
 * Default configuration values.
 *
 * currency: ISO 4217
 * timeout: API request timeout in ms
 * publicKey: Recurly site public key
 * cors: Whether to use XHR2/XDR+CORS over jsonp for API requests
 * fraud: fraud configuration
 * api: URL of API
 * fields: field behavior and styling configuration
 *
 * @private
 * @type {Object}
 */

const defaults = {
  currency: 'USD',
  timeout: 60000,
  publicKey: '',
  parent: true,
  parentVersion: version,
  cors: true,
  fraud: {
    kount: { dataCollector: false },
    litle: { sessionId: null }
  },
  api: 'https://api.recurly.com/js/v1',
  fields: {
    all: {
      style: {}
    },
    number: {
      selector: '[data-recurly=number]',
      style: {}
    },
    month: {
      selector: '[data-recurly=month]',
      style: {}
    },
    year: {
      selector: '[data-recurly=year]',
      style: {}
    },
    cvv: {
      selector: '[data-recurly=cvv]',
      style: {}
    }
  }
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
    this.id = uuid();
    this.version = version;
    this.configured = false;
    this.readyState = 0;
    this.config = merge({}, defaults);
    if (options) this.configure(options);
    this.bankAccount = {
      token: bankAccount.token.bind(this),
      bankInfo: bankAccount.bankInfo.bind(this)
    };
  }

  ready (done) {
    if (this.readyState > 1) done();
    else this.once('ready', done);
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
    debug('configure');

    options = clone(options);

    if (type(options) === 'string') options = { publicKey: options };

    options = normalizeOptions(options)

    if (options.publicKey) {
      this.config.publicKey = options.publicKey;
    } else if (!this.config.publicKey) {
      throw errors('config-missing-public-key');
    }

    if (options.api) {
      this.config.api = options.api;
    }

    if (options.currency) {
      this.config.currency = options.currency;
    }

    if ('cors' in options) {
      this.config.cors = options.cors;
    }

    if ('fraud' in options) {
      merge(this.config.fraud, options.fraud);
    }

    if ('parent' in options) {
      this.config.parent = options.parent;
    }

    if (type(options.fields) === 'object') {
      merge(this.config.fields, options.fields);
    }

    this.config.required = options.required || this.config.required || [];

    // Begin parent role configuration and setup
    if (this.config.parent) this.parent();
    else {
      if (options.parentVersion) this.config.parentVersion = options.parentVersion;
    }

    this.configured = true;
  }

  /**
   * Initialize the parent recurly instance concerns: hosted fields and message bus
   *
   * sets this.readyState
   *   0: unconfigured
   *   1: begun intializing hosted fields
   *   2: done initializing hosted fields
   *   3: done initializing (no hosted fields)
   *
   * @private
   */

  parent () {
    let reset = false;

    if (this.hostedFields) {
      // Check integrity of hostedFields. If fields are dead or do not match chosen selectors, reset
      if (this.readyState > 1 && !this.hostedFields.integrityCheck(this.config.fields)) reset = true;
    }

    if (reset) {
      this.readyState = 0;
      this.hostedFields.reset();
    }

    if (this.readyState > 0) {
      this.bus.send('hostedFields:configure');
      return;
    }

    if (!this.fraud) this.fraud = new Fraud(this);

    if (this.bus) this.bus.stop();
    this.bus = new Bus({ api: this.config.api });
    this.bus.add(this);

    if (!this.hostedFields || reset) {
      this.hostedFields = new HostedFields({ recurly: this.config });
    }

    if (this.hostedFields.errors.length === 0) {
      this.bus.add(this.hostedFields);
      this.once('hostedFields:ready', body => {
        this.readyState = 2;
        this.emit('ready');
      });
      this.on('hostedFields:state:change', body => this.emit('change', { fields: body }));
      this.on('hostedField:submit', () => this.emit('field:submit'));
      this.readyState = 1;
    } else {
      this.readyState = 3;
      this.emit('ready');
    }
  }

  /**
   * Assembles the API endpoint.
   *
   * @return {String} route
   * @private
   */

  url (route) {
    return this.config.api + route;
  }

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
    debug('request', method, route, data);

    if (!this.configured) {
      throw errors('not-configured');
    }

    if ('function' == type(data)) {
      done = data;
      data = {};
    }

    if (this.config.parent) {
      data.version = this.version
    } else {
      data.version = this.config.parentVersion;
    }

    data.key = this.config.publicKey;

    if (this.config.cors) {
      return this.xhr(method, route, data, done);
    } else {
      return this.jsonp(route, data, done);
    }
  }

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
        return done(errors('api-error', { message: `There was a problem parsing the API response with: ${this.responseText}` }));
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
  }

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
  }

  Pricing () {
    return new Pricing(this);
  }
}

Recurly.prototype.Frame = Frame;
Recurly.prototype.coupon = require('./recurly/coupon');
Recurly.prototype.giftcard = giftcard;
Recurly.prototype.ApplePay = ApplePay;
Recurly.prototype.PayPal = PayPal;
Recurly.prototype.paypal = deprecatedPaypal;
Recurly.prototype.Adyen = Adyen;
Recurly.prototype.plan = require('./recurly/plan');
Recurly.prototype.tax = require('./recurly/tax');
Recurly.prototype.token = require('./recurly/token');
Recurly.prototype.validate = require('./recurly/validate');

/**
 * Standardizes old configuration structure to current
 *
 * 1. options.fields.[field] {String} -> options.fields.[field].selector {String}
 * 2. options.style.[field] {Object} -> options.fields.[field].style {Object}
 * 3. options.style.all {Object} -> options.fields.all.style {Object}
 *
 * @param  {Object} options
 * @return {Object}
 */
function normalizeOptions (options) {
  const baseStyleConfig = options.style || {};

  delete options.style;

  FIELD_TYPES.forEach(type => {
    // 1
    if (options.fields && typeof options.fields[type] === 'string') {
      options.fields[type] = { selector: options.fields[type] };
    }
    // 2
    if (baseStyleConfig[type]) {
      options.fields = options.fields || {};
      options.fields[type] = options.fields[type] || {};
      options.fields[type].style = merge({}, baseStyleConfig[type], options.fields[type].style);
    }
  });

  // 3
  if (baseStyleConfig.all) {
    options.fields = options.fields || {};
    options.fields.all = { style: baseStyleConfig.all };
  }

  return options;
}
