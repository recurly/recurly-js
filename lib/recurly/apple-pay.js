import Promise from 'promise';
import Emitter from 'component-emitter';
import errors from '../errors';
import {Pricing} from './pricing';

const debug = require('debug')('recurly:apple-pay');

const SESSION_TIMEOUT = 300000; // 5m
const APPLE_PAY_API_VERSION = 2;

export function factory (options) {
  return new ApplePay(Object.assign({}, options, { recurly: this }));
};

/**
 * Initializes an Apple Pay session.
 *
 * @param {Object} options
 * @constructor
 * @public
 */

class ApplePay extends Emitter {
  constructor (options) {
    super();

    this._ready = false;
    this.config = {};
    this.once('ready', () => this._ready = true);

    // Detect whether Apple Pay is available
    if (!ApplePaySession) {
      this.initError = this.error('apple-pay-not-supported');
    } else if (!ApplePaySession.canMakePayments()) {
      this.initError = this.error('apple-pay-not-available');
    }

    if (!this.initError) {
      this.configure(options);
    }
  }

  get session () {
    if (this._session) return this._session;

    debug('Creating new Apple Pay session');

    let session = new ApplePaySession(APPLE_PAY_API_VERSION, {
      countryCode: this.config.country,
      currencyCode: this.config.currency,
      supportedNetworks: this.config.supportedNetworks,
      merchantCapabilities: this.config.merchantCapabilities,
      total: { label: this.config.label, amount: this.config.total }
    });

    session.onvalidatemerchant = this.onValidateMerchant.bind(this);
    session.onshippingcontactselected = this.onShippingContactSelected.bind(this);
    session.onshippingmethodselected = this.onShippingMethodSelected.bind(this);
    session.onpaymentmethodselected = this.onPaymentMethodSelected.bind(this);
    session.onpaymentauthorized = this.onPaymentAuthorized.bind(this);
    session.oncancel = this.onCancel.bind(this);

    return this._session = session;
  }

  get lineItems () {
    // Clone configured line items
    return [].concat(this.config.lineItems);
  }

  get total () {
    return { type: 'final', label: this.config.label, amount: this.config.total };
  }

  get planLabel () {
    if (this.config.pricing && this.config.pricing.items.plan) return this.config.pricing.items.plan.name;
    else return 'Subscription plan';
  }

  ready (cb) {
    if (this._ready) cb();
    else this.once('ready', cb);
  }

  configure (options) {
    if ('label' in options) this.config.label = options.label;
    else return this.initError = this.error('apple-pay-config-missing', { opt: 'label' });

    // Initialize with no line items
    this.config.lineItems = [];

    // Determine pricing determination mechanism
    if ('pricing' in options) {
      this.config.pricing = options.pricing;
      this.config.pricing.on('change', this.onPricingChange.bind(this));
    } else if ('total' in options) {
      this.config.total = options.total;
    } else {
      return this.initError = this.error('apple-pay-config-missing', { opt: 'total' });
    }

    if ('recurly' in options) this.recurly = options.recurly;
    else return this.initError = this.error('apple-pay-factory-only');

    // Retrieve remote configuration
    this.recurly.request('get', '/apple_pay/info', (err, info) => {
      if (err) return this.initError = this.error(err);

      if ('countries' in info && ~info.countries.indexOf(options.country)) this.config.country = options.country;
      else return this.initError = this.error('apple-pay-config-invalid', { opt: 'country', set: info.countries });

      if ('currencies' in info && ~info.currencies.indexOf(options.currency)) this.config.currency = options.currency;
      else return this.initError = this.error('apple-pay-config-invalid', { opt: 'currency', set: info.currencies });

      this.config.merchantCapabilities = info.merchantCapabilities || [];
      this.config.supportedNetworks = info.supportedNetworks || [];

      this.emit('ready');
    });
  }

  /**
   * Begins Apple Pay transaction
   */
  begin () {
    if (this.initError) return this.error('apple-pay-init-error', { err: this.initError });
    delete this._session;
    this.session.begin();
  }

  /**
   * Updates line items and total price on pricing module changes
   *
   * @param  {Object} price Pricing.price
   */
  onPricingChange (price) {
    // Reset line items
    this.config.lineItems = [];
    this.config.total = price.now.total;
  }

  /**
   * Validates the merchant session
   *
   * @param  {Event} event ApplePayValidateMerchantEvent
   * @return {[type]}       [description]
   */
  onValidateMerchant (event) {
    debug('Validating Apple Pay merchant session', event);

    const validationURL = event.validationURL;

    this.recurly.request('post', '/apple_pay/start', { validationURL }, (err, merchantSession) => {
      if (err) return this.error(err);
      console.info('session started', err, merchantSession);
      this.session.completeMerchantValidation(merchantSession);
    });
  }

  /**
   * Handles payment method selection
   *
   * @param  {Event} event
   */
  onPaymentMethodSelected (event) {
    debug('Payment method selected', event);
    this.session.completePaymentMethodSelection(this.total, this.lineItems);
  }

  /**
   * Handles shipping contact selection. Not utilized
   *
   * @param  {Event} event
   */
  onShippingContactSelected (event) {
    const status = this.session.STATUS_SUCCESS;
    const newShippingMethods = [];
    this.session.completeShippingContactSelection(status, newShippingMethods, this.total, this.lineItems);
  }

  /**
   * Handles shipping method selection. Not utilized
   *
   * @param  {Event} event
   */
  onShippingMethodSelected (event) {
    this.session.completeShippingMethodSelection(this.total, this.lineItems);
  }

  /**
   * Handles payment authorization. Submits payment token and
   * emits the resultant authorization token
   *
   * @emit 'token'
   * @emit
   *
   * @param  {Event} event
   */
  onPaymentAuthorized (event) {
    debug('Payment authorization received', event);

    this.recurly.request('post', '/apple_pay/token', event.payment.token, (err, token) => {
      if (err) {
        this.session.completePayment(this.session.STATUS_FAILURE);
        return this.error('apple-pay-payment-failure', err);
      }

      debug('Token received', token);

      this.session.completePayment(this.session.STATUS_SUCCESS);
      this.emit('token', token);
    });
  }

  onCancel (event) {
    debug('User canceled Apple Pay payment', event);

    this.emit('cancel', event);
  }

  error (...params) {
    let err = params[0] instanceof Error ? params[0] : errors(...params);
    this.emit('error', err);
    return err;
  }
}
