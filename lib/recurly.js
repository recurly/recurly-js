/*jshint -W058 */

import clone from 'component-clone';
import deepAssign from './util/deep-assign';
import deepFilter from 'deep-filter';
import Emitter from 'component-emitter';
import pick from 'lodash.pick';
import uid from './util/uid';
import errors from './recurly/errors';
import { bankAccount } from './recurly/bank-account';
import coupon from './recurly/coupon';
import giftCard from './recurly/gift-card';
import item from './recurly/item';
import plan from './recurly/plan';
import tax from './recurly/tax';
import version from './recurly/version';
import { tokenDispatcher as token } from './recurly/token';
import { factory as Adyen } from './recurly/adyen';
import { factory as ApplePay } from './recurly/apple-pay';
import { factory as GooglePay } from './recurly/google-pay';
import { factory as BankRedirect } from './recurly/bank-redirect';
import { factory as AlternativePaymentMethods } from './recurly/alternative-payment-methods';
import { factory as Elements } from './recurly/elements';
import { factory as Frame } from './recurly/frame';
import { factory as PayPal } from './recurly/paypal';
import { factory as Venmo } from './recurly/venmo';
import { factory as Risk } from './recurly/risk';
import { factory as AmazonPay } from './recurly/amazon';
import { deprecated as deprecatedPaypal } from './recurly/paypal/strategy/direct';
import { Bus } from './recurly/bus';
import { Reporter } from './recurly/reporter';
import { Fraud } from './recurly/fraud';
import { HostedFields, FIELD_TYPES } from './recurly/hosted-fields';
import { Request } from './recurly/request';
import { fetch as storageFetch, set as storageSet } from './util/web-storage';
import CheckoutPricing from './recurly/pricing/checkout';
import SubscriptionPricing from './recurly/pricing/subscription';

const debug = require('debug')('recurly');

const DEFAULT_API_URL = 'https://api.recurly.com/js/v1';
const DEFAULT_API_URL_EU = 'https://api.eu.recurly.com/js/v1';

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

const DEFAULTS = {
  currency: 'USD',
  timeout: 60000,
  publicKey: '',
  parent: true,
  parentVersion: version,
  cors: true,
  fraud: {
    kount: { dataCollector: false, form: undefined },
    litle: { sessionId: undefined },
    braintree: { deviceData: undefined }
  },
  risk: {
    threeDSecure: { preflightDeviceDataCollector: true }
  },
  api: DEFAULT_API_URL,
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
    },
    card: {
      selector: '[data-recurly=card]',
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
  Adyen = Adyen;
  ApplePay = ApplePay;
  GooglePay = GooglePay;
  BankRedirect = BankRedirect;
  AlternativePaymentMethods = AlternativePaymentMethods;
  coupon = coupon;
  Elements = Elements;
  Frame = Frame;
  giftCard = giftCard;
  giftcard = giftCard; // DEPRECATED
  item = item;
  PayPal = PayPal;
  Venmo = Venmo;
  paypal = deprecatedPaypal;
  plan = plan;
  Risk = Risk;
  tax = tax;
  token = token;
  AmazonPay = AmazonPay;
  validate = require('./recurly/validate').publicMethods;

  /**
   * Expose the class through its common name
   */
  Recurly = this.constructor;

  constructor (options) {
    super();
    this.id = uid();
    this.version = version;
    this.configured = false;
    this.readyState = 0;
    this.request = new Request({ recurly: this });
    this.config = deepAssign({}, DEFAULTS);
    if (options) this.configure(options);
    this.bankAccount = {
      token: bankAccount.token.bind(this),
      bankInfo: bankAccount.bankInfo.bind(this)
    };
    this.reporter = new Reporter({ recurly: this });

    this.Pricing = () => new SubscriptionPricing(this); // deprecated
    this.Pricing.Checkout = () => new CheckoutPricing(this);
    this.Pricing.Subscription = () => new SubscriptionPricing(this);

    this.once('ready', () => this.report('ready'));
    this.bindReporting();
  }

  /**
   * Whether this instance is considered a parent
   *
   * @return {Boolean}
   */
  get isParent () {
    return !!this.config.parent;
  }

  get deviceId () {
    return storageFetch({ key: 'deviceId', otherwise: uid() });
  }

  set deviceId (id) {
    return storageSet({ key: 'deviceId', value: id });
  }

  get sessionId () {
    return storageFetch({ scope: 'session', key: 'sessionId', otherwise: uid() });
  }

  set sessionId (id) {
    return storageSet({ scope: 'session', key: 'sessionId', value: id });
  }

  /**
   * Configuration Object prepared for marshalling
   *
   * @return {Object}
   */
  get sanitizedConfig () {
    return deepFilter(this.config, val => !(val instanceof Node));
  }

  /**
   * Assembles the API endpoint
   *
   * @return {String} route
   */
  url (route) {
    return this.config.api + route;
  }

  /**
   * Queues or immediately invokes a callback when the instance is
   * in the ready state
   *
   * @param  {Function} done callback
   */
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

    if (typeof options === 'string') options = { publicKey: options };

    options = normalizeOptions(options);

    if (options.publicKey) {
      this.config.publicKey = options.publicKey;
    } else if (!this.config.publicKey) {
      throw errors('config-missing-public-key');
    }

    if (options.api) {
      this.config.api = options.api;
    } else if (this.config.publicKey.lastIndexOf('fra-', 0) === 0 && this.config.api === DEFAULT_API_URL) {
      this.config.api = DEFAULT_API_URL_EU;
    }

    if (options.currency) {
      this.config.currency = options.currency;
    }

    if ('cors' in options) {
      this.config.cors = options.cors;
    }

    if ('fraud' in options) {
      deepAssign(this.config.fraud, options.fraud);
    }

    if ('risk' in options) {
      deepAssign(this.config.risk, options.risk);
    }

    if ('parent' in options) {
      this.config.parent = options.parent;
    }

    if (typeof options.fields === 'object') {
      deepAssign(this.config.fields, options.fields);
    }

    this.config.required = options.required || this.config.required || [];

    // Begin parent role configuration and setup
    if (this.config.parent) {
      this.parent();
    } else {
      if (options.parentVersion) this.config.parentVersion = options.parentVersion;
    }

    if (!this.configured) {
      this.configured = true;
      this.emit('configured');
      this.report('configured');
    }

    // Since this readyState indicates synchronous preparation, we may now
    // emit ready
    if (this.readyState === 3) {
      this.emit('ready');
    }
  }

  /**
   * Disables a recurly.js instance
   *
   * - Removes all listeners
   * - Propagates a destroy call to the bus
   * - Stops the bus
   * - Removes external references
   *
   * TODO:
   *  - destroy pricing instances, or let them live on? Currently they
   *    may live on since their associated recurly instances remain configured
   *    for API requests.
   */
  destroy () {
    debug('destroying Recurly instance', this.id);
    this.off();
    if (this.bus) {
      this.bus.send('destroy');
      this.bus.destroy();
    }
    if (this.fraud) {
      this.fraud.destroy();
    }
    if (this.reporter) {
      this.reporter.destroy();
      delete this.reporter;
    }
  }

  /**
   * Initialize the parent recurly instance concerns: hosted fields and message bus
   *
   * TODO: readyState is not a good pattern
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
    // Check integrity of hostedFields. If fields are dead or
    // do not match chosen selectors, reset
    let reset = (
      this.hostedFields
      && this.readyState > 0
      && !this.hostedFields.integrityCheck(this.config.fields)
    );

    if (reset) {
      // If we are between states 1 and 2, we must abandon the advancement listeners
      if (this.readyState === 1) {
        this.off('hostedFields:ready');
        this.off('hostedFields:state:change');
        this.off('hostedField:submit');
      }
      this.readyState = 0;
      this.hostedFields.destroy();
    }

    if (this.readyState > 0) {
      this.bus.send('hostedFields:configure', { recurlyConfig: this.sanitizedConfig });
      return;
    }

    if (this.fraud) {
      this.ready(this.fraud.activateProfiles);
    } else {
      this.fraud = new Fraud(this);
      this.fraud.on('error', (...args) => {
        this.emit('error', ...args);
      });
    }

    if (!this.bus) {
      this.bus = new Bus({ api: this.config.api, role: 'recurly' });
      this.bus.add(this);
    }

    if (!this.hostedFields || reset) {
      this.hostedFields = new HostedFields({ recurly: this });
    }

    if (this.hostedFields.errors.length === 0) {
      this.bus.add(this.hostedFields);
      this.once('hostedFields:ready', () => {
        this.readyState = 2;
        setTimeout(() => this.emit('ready'), 0);
      });
      this.on('hostedFields:state:change', body => this.emit('change', { fields: body }));
      this.on('hostedField:submit', () => this.emit('field:submit'));
      this.readyState = 1;
    } else {
      this.readyState = 3;
    }
  }

  /**
   * Reports an event to the Reporter if it is available
   *
   * @private
   */
  report (...args) {
    if (!this.reporter) return;
    this.reporter.send(...args);
  }

  error (code, context = {}) {
    return errors(code, context, { reporter: this.reporter });
  }

  /**
   * Binds important events to the EventDispatcher
   *
   * @private
   */
  bindReporting () {
    if (!this.isParent) return;
    ['focus', 'blur'].forEach(eventName => {
      this.on(`hostedField:${eventName}`, ({ type }) => {
        const state = this.hostedFields.state[type];
        let meta = pick(state, ['type', 'valid', 'empty']);
        if (state.brand) meta.brand = state.brand;
        this.report(`hosted-field:${eventName}`, meta);
      });
    });
  }
}

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
      options.fields[type].style = deepAssign({}, baseStyleConfig[type], options.fields[type].style);
    }
  });

  // 3
  if (baseStyleConfig.all) {
    options.fields = options.fields || {};
    options.fields.all = { style: baseStyleConfig.all };
  }

  return options;
}
