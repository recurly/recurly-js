/*jshint -W058 */

import partial from 'lodash.partial';
import bind from 'component-bind';
import type from 'component-type';
import merge from 'lodash.merge';
import jsonp from 'jsonp';
import qs from 'qs';
import Emitter from 'component-emitter';
import errors from './errors';
import version from './version';
import bankAccount from './recurly/bank-account';
import {Bus} from './recurly/bus';
import {Fraud} from './recurly/fraud';
import {HostedFields} from './recurly/hosted-fields';
import {Message} from './recurly/message';
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
 * api: URL of API
 *
 * @private
 * @type {Object}
 */

const defaults = {
  currency: 'USD',
  timeout: 60000,
  publicKey: '',
  parent: true,
  cors: true,
  fraud: {
    kount: { dataCollector: false },
    litle: { sessionId: null }
  },
  api: 'https://api.recurly.com/js/v1',
  style: {},
  fields: {
    number: '[data-recurly=number]',
    month: '[data-recurly=month]',
    year: '[data-recurly=year]',
    cvv: '[data-recurly=cvv]'
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
    this.id = 0;
    this.version = version;
    this.configured = false;
    this.readyState = 0;
    this.config = merge({}, defaults);
    if (options) this.configure(options);
    this.bankAccount = {
      token: bind(this, bankAccount.token),
      bankInfo: bind(this, bankAccount.bankInfo)
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

    if (type(options) === 'string') options = { publicKey: options };

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

    if ('style' in options) {
      merge(this.config.style, options.style);
    }

    if (type(options.fields) === 'object') {
      merge(this.config.fields, options.fields);
    }

    this.config.required = options.required || this.config.required || [];

    // Begin parent role configuration and setup
    if (this.config.parent) this.parent();

    this.configured = true;
  }

  /**
   * Initialize the parent recurly instance concerns: hosted fields and message bus
   *
   * sets this.readyState
   *   0: unconfigured
   *   1: begun intializing hosted fields
   *   2: done intializing hosted fields
   *   3: done initializing (no hosted fields)
   *
   * @private
   */

  parent () {
    if (this.readyState > 0) {
      this.bus.send('hostedFields:configure', this.config);
      return;
    }

    this.fraud = new Fraud(this);

    this.bus = new Bus;
    this.bus.add(this);

    this.hostedFields = new HostedFields(this.config);

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
    debug('request');

    if (!this.configured) {
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


Recurly.prototype.open = require('./recurly/open');
Recurly.prototype.relay = require('./recurly/relay');
Recurly.prototype.coupon = require('./recurly/coupon');
Recurly.prototype.giftcard = giftcard;
Recurly.prototype.paypal = require('./recurly/paypal');
Recurly.prototype.plan = require('./recurly/plan');
Recurly.prototype.tax = require('./recurly/tax');
Recurly.prototype.token = require('./recurly/token');
Recurly.prototype.validate = require('./recurly/validate');
