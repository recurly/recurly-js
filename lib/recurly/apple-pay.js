import Promise from 'promise';
import Emitter from 'component-emitter';
import errors from '../errors';
import {Pricing} from './pricing';

const debug = require('debug')('recurly:apple-pay');

const SESSION_TIMEOUT = 300000; // 5m

export function factory (options) {
  return new ApplePay(Object.assign({}, options, { recurly: this }));
};

class ApplePay extends Emitter {
  constructor (options) {
    super();

    this._ready = false;
    this.config = {};
    this.once('ready', () => this._ready = true);

    if (!global.ApplePaySession) return this.fatal = this.error('apple-pay-not-supported');
    if (!ApplePaySession.canMakePayments()) return this.fatal = this.error('apple-pay-not-available');

    this.configure(options);
    if (!this.fatal) this.emit('ready');
  }

  get session () {
    if (this._session) return this._session;

    debug('Creating new Apple Pay session');

    let session = new ApplePaySession(2, {
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

  ready (cb) {
    if (this._ready) cb();
    else this.once('ready', cb);
  }

  configure (options) {
    if ('label' in options) this.config.label = options.label;
    else return this.fatal = this.error('apple-pay-config-missing', { opt: 'label' });

    if ('pricing' in options) {
      this.config.pricing = options.pricing;
      this.config.pricing.on('change', p => this.config.total = p.now.total);
    } else if ('total' in options) {
      this.config.total = options.total;
    } else {
      return this.fatal = this.error('apple-pay-config-missing', { opt: 'total' });
    }

    if ('recurly' in options) this.recurly = options.recurly;
    else this.fatal = this.error('apple-pay-factory-only');

    // Retrieve remote configuration
    this.recurly.request('get', '/apple_pay/info', (err, info) => {
      if (err) return this.fatal = this.error(err);

      if ('countries' in info && ~info.countries.indexOf(options.country)) this.config.country = options.country;
      else return this.fatal = this.error('apple-pay-config-invalid', { opt: 'country', set: info.countries });

      if ('currencies' in info && ~info.currencies.indexOf(options.currency)) this.config.currency = options.currency;
      else return this.fatal = this.error('apple-pay-config-invalid', { opt: 'currency', set: info.currencies });

      this.config.merchantCapabilities = info.merchantCapabilities || [];
      this.config.supportedNetworks = info.supportedNetworks || [];
      this.config.supportedNetworks = ['visa'];
    });
  }

  begin (done) {
    if (this.fatal) return this.error('apple-pay-fatal-error', { err: this.fatal });
    delete this._session;
    this.session.begin();
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

    // TODO: integrate pricing API
    const newTotal = {
      type: 'final',
      label: this.config.label,
      amount: this.config.total
    };
    const newLineItems = [
      { type: 'final', label: this.config.label, amount: this.config.total }
      // TODO: Apply discounts and shipping costs
    ];

    this.session.completePaymentMethodSelection(newTotal, newLineItems);
  }

  onShippingContactSelected (event) {
    const status = this.session.STATUS_SUCCESS;
    const newShippingMethods = [];
    const newTotal = {
      type: 'final',
      label: this.config.label,
      amount: this.config.total
    };
    const newLineItems = [
      { type: 'final', label: this.config.label, amount: this.config.total }
      // TODO: Apply discounts and shipping costs
    ];

    this.session.completeShippingContactSelection(status, newShippingMethods, newTotal, newLineItems);
  }

  onShippingMethodSelected (event) {
    // TODO: integrate pricing API
    const newTotal = {
      type: 'final',
      label: this.config.label,
      amount: this.config.total
    };
    const newLineItems = [
      { type: 'final', label: this.config.label, amount: this.config.total }
      // TODO: Apply discounts and shipping costs
    ];

    this.session.completePaymentMethodSelection(newTotal, newLineItems);
  }

  onPaymentAuthorized (event) {
    debug('Payment authorization received', event);

    let status;
    let success = true;

    // TODO: Payment authorization, send event.payment.token;

    if (success){
      status = this.session.STATUS_SUCCESS;
    } else {
      status = this.session.STATUS_FAILURE;
    }

    this.session.completePayment(status);
  }

  onCancel (event) {
    debug('User canceled Apple Pay payment', event);

    // TODO: mark the session as dead?
  }

  error (...params) {
    let err = params[0] instanceof Error ? params[0] : errors(...params);
    this.emit('error', err);
    return err;
  }
}
