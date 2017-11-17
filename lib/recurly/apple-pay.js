import Emitter from 'component-emitter';
import errors from '../errors';
import {Pricing} from './pricing';
import {normalize} from '../util/normalize';
import {FIELDS} from './token';

const debug = require('debug')('recurly:apple-pay');

const APPLE_PAY_API_VERSION = 2;
const APPLE_PAY_ADDRESS_MAP = {
  first_name: 'givenName',
  last_name: 'familyName',
  address1: 'addressLines',
  address2: 'addressLines',
  city: 'locality',
  state: 'administrativeArea',
  postal_code: 'postalCode',
  country: 'countryCode'
}

/**
 * Instantiation factory
 *
 * @param  {Object} options
 * @return {ApplePay}
 */
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
    if (!global.ApplePaySession) {
      this.initError = this.error('apple-pay-not-supported');
    } else if (!global.ApplePaySession.canMakePayments()) {
      this.initError = this.error('apple-pay-not-available');
    }

    if (!this.initError) {
      this.configure(options);
    }
  }

  /**
   * @return {ApplePaySession} Bound Apple Pay session
   * @private
   */
  get session () {
    if (this._session) return this._session;

    debug('Creating new Apple Pay session');

    let session = new global.ApplePaySession(APPLE_PAY_API_VERSION, {
      countryCode: this.config.country,
      currencyCode: this.config.currency,
      supportedNetworks: this.config.supportedNetworks,
      merchantCapabilities: this.config.merchantCapabilities,
      requiredBillingContactFields: ['postalAddress'],
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

  /**
   * @return {Array} subtotal line items for display on payment sheet
   */
  get lineItems () {
    // Clone configured line items
    return [].concat(this.config.lineItems);
  }

  /**
   * @return {Object} total cost line item
   * @private
   */
  get total () {
    return { type: 'final', label: this.config.label, amount: this.config.total };
  }

  /**
   * Initialized state callback registry
   *
   * @param  {Function} cb callback
   * @private
   */
  ready (cb) {
    if (this._ready) cb();
    else this.once('ready', cb);
  }

  /**
   * Configures a new instance
   *
   * @param  {Object} options
   * @emit 'ready'
   * @private
   */
  configure (options) {
    if ('label' in options) this.config.label = options.label;
    else return this.initError = this.error('apple-pay-config-missing', { opt: 'label' });

    if ('form' in options) this.config.form = options.form;

    // Initialize with no line items
    this.config.lineItems = [];

    // Listen for pricing changes to update totals and currency
    const { pricing } = options;
    if (pricing instanceof Pricing) {
      this.config.pricing = pricing;
      pricing.on('change', price => this.updatePriceFromPricing());
      if (pricing.hasPrice) this.updatePriceFromPricing();
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
   * Maps data from the Apple Pay token into the inputs
   * object that is sent to RA for tokenization
   *
   * @public
   */
  mapPaymentData (inputs, data) {
    inputs.paymentData = data.token.paymentData;
    inputs.paymentMethod = data.token.paymentMethod;

    if (!data.billingContact) return;
    if (FIELDS.some(field => inputs[field])) return;

    FIELDS.forEach(field => {
      if (!APPLE_PAY_ADDRESS_MAP[field]) return;

      let tokenData = data.billingContact[APPLE_PAY_ADDRESS_MAP[field]];

      // address lines are an array from Apple Pay
      if (field === 'address1') tokenData = tokenData[0];
      else if (field === 'address2') tokenData = tokenData[1];

      inputs[field] = tokenData;
    });
  }

  /**
   * Begins Apple Pay transaction
   *
   * @public
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
   * @private
   */
  updatePriceFromPricing () {
    this.config.lineItems = [];
    this.config.total = this.config.pricing.totalNow;
  }

  /**
   * Validates the merchant session
   *
   * @param  {Event} event ApplePayValidateMerchantEvent
   * @return {[type]} [description]
   * @private
   */
  onValidateMerchant (event) {
    debug('Validating Apple Pay merchant session', event);

    const validationURL = event.validationURL;

    this.recurly.request('post', '/apple_pay/start', { validationURL }, (err, merchantSession) => {
      if (err) return this.error(err);
      this.session.completeMerchantValidation(merchantSession);
    });
  }

  /**
   * Handles payment method selection
   *
   * @param  {Event} event
   * @private
   */
  onPaymentMethodSelected (event) {
    debug('Payment method selected', event);
    this.session.completePaymentMethodSelection(this.total, this.lineItems);
  }

  /**
   * Handles shipping contact selection. Not utilized
   *
   * @param  {Event} event
   * @private
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
   * @private
   */
  onShippingMethodSelected (event) {
    this.session.completeShippingMethodSelection(this.total, this.lineItems);
  }

  /**
   * Handles payment authorization. Submits payment token and
   * emits the resultant authorization token
   *
   * @param  {Event} event
   * @emit 'token'
   * @private
   */
  onPaymentAuthorized (event) {
    debug('Payment authorization received', event);

    let inputs = {};

    if (this.config.form) {
      inputs = normalize(FIELDS, this.config.form, { parseCard: false }).values;
    }

    this.mapPaymentData(inputs, event.payment);

    this.recurly.request('post', '/apple_pay/token', inputs, (err, token) => {
      if (err) {
        this.session.completePayment(this.session.STATUS_FAILURE);
        return this.error('apple-pay-payment-failure', err);
      }

      debug('Token received', token);

      this.session.completePayment(this.session.STATUS_SUCCESS);
      this.emit('token', token);
    });
  }

  /**
   * Handles customer cancelation. Passes on the event
   *
   * @param  {Event} event
   * @emit 'cancel'
   * @private
   */
  onCancel (event) {
    debug('User canceled Apple Pay payment', event);

    this.emit('cancel', event);
  }

  /**
   * Creates and emits a RecurlyError
   *
   * @param  {...Mixed} params to be passed to the Recurlyerror factory
   * @return {RecurlyError}
   * @emit 'error'
   * @private
   */
  error (...params) {
    let err = params[0] instanceof Error ? params[0] : errors(...params);
    this.emit('error', err);
    return err;
  }
}
