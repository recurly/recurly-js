import Emitter from 'component-emitter';
import errors from '../errors';
import { Pricing } from '../pricing';
import PricingPromise from '../pricing/promise';
import { normalize } from '../../util/normalize';
import decimalize from '../../util/decimalize';
import { FIELDS } from '../token';

const debug = require('debug')('recurly:apple-pay');

const APPLE_PAY_API_VERSION = 4;
const APPLE_PAY_ADDRESS_MAP = {
  first_name: 'givenName',
  last_name: 'familyName',
  address1: 'addressLines',
  address2: 'addressLines',
  city: 'locality',
  state: 'administrativeArea',
  postal_code: 'postalCode',
  country: 'countryCode'
};

const I18N = {
  subtotalLineItemLabel: 'Subtotal',
  discountLineItemLabel: 'Discount',
  taxLineItemLabel: 'Tax',
  giftCardLineItemLabel: 'Gift card'
};

/**
 * Initializes an Apple Pay session.
 *
 * @param {Object} options
 * @param {Recurly} options.recurly
 * @param {String} options.country
 * @param {String} options.currency
 * @param {String} options.label label to display to customers in the Apple Pay dialogue
 * @param {String} options.total transaction total in format '1.00'
 * @param {HTMLElement} [options.form] to provide additional customer data
 * @param {Pricing} [options.pricing] to provide transaction total from Pricing
 * @constructor
 * @public
 */

export class ApplePay extends Emitter {
  constructor (options) {
    super();

    this._ready = false;
    this.config = {
      i18n: I18N
    };
    this.once('ready', () => this._ready = true);

    // Detect whether Apple Pay is available
    if (!(window.ApplePaySession && window.ApplePaySession.supportsVersion(APPLE_PAY_API_VERSION))) {
      this.initError = this.error('apple-pay-not-supported');
    } else if (!window.ApplePaySession.canMakePayments()) {
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

    let sessionOptions = {
      countryCode: this.config.country,
      currencyCode: this.config.currency,
      supportedNetworks: this.config.supportedNetworks,
      merchantCapabilities: this.config.merchantCapabilities,
      requiredBillingContactFields: ['postalAddress'],
      requiredShippingContactFields: this.config.requiredShippingContactFields,
      total: this.totalLineItem,
    };

    if (this.config.supportedCountries) {
      sessionOptions.supportedCountries = this.config.supportedCountries;
    }

    let session = new window.ApplePaySession(APPLE_PAY_API_VERSION, sessionOptions);

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
   * @private
   */
  get lineItems () {
    // Clone configured line items
    return [].concat(this.config.lineItems);
  }

  /**
   * @return {Object} total cost line item
   * @private
   */
  get totalLineItem () {
    return lineItem(this.config.label, this.config.total);
  }

  /**
   * @return {Object} total cost line item indicating a finalized line item
   * @private
   */
  get finalTotalLineItem () {
    return Object.assign({}, this.totalLineItem, { type: 'final' });
  }

  /**
   * Initialized state callback registry
   *
   * @param  {Function} cb callback
   * @public
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

    if ('recurly' in options) this.recurly = options.recurly;
    else return this.initError = this.error('apple-pay-factory-only');

    if ('i18n' in options) Object.assign(this.config.i18n, options.i18n);

    if (options.pricing instanceof PricingPromise) {
      this.config.pricing = options.pricing.pricing;
    } else if (options.pricing instanceof Pricing) {
      this.config.pricing = options.pricing;
    } else if ('total' in options) {
      this.config.total = options.total;
    } else {
      return this.initError = this.error('apple-pay-config-missing', { opt: 'total' });
    }

    // If pricing is provided, attach change listeners
    if (this.config.pricing) {
      this.config.pricing.on('change', () => this.onPricingChange());
      if (this.config.pricing.hasPrice) this.onPricingChange();
    }

    this.recurly.request.get({
      route: '/apple_pay/info',
      data: { currency: options.currency },
      done: this.applyRemoteConfig(options)
    });
  }

  /**
   * Assigns ApplePay configuration from site config
   * @param  {object} options
   * @private
   */
  applyRemoteConfig (options) {
    return (err, info) => {
      if (err) return this.initError = this.error(err);

      if ('countries' in info && ~info.countries.indexOf(options.country)) this.config.country = options.country;
      else return this.initError = this.error('apple-pay-config-invalid', { opt: 'country', set: info.countries });

      if ('currencies' in info && ~info.currencies.indexOf(options.currency)) this.config.currency = options.currency;
      else return this.initError = this.error('apple-pay-config-invalid', { opt: 'currency', set: info.currencies });

      this.config.merchantCapabilities = info.merchantCapabilities || [];
      this.config.supportedNetworks = info.supportedNetworks || [];
      this.config.requiredShippingContactFields = options.requiredShippingContactFields || [];

      this.emit('ready');
    };
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
  onPricingChange () {
    const { pricing } = this.config;

    let lineItems = this.config.lineItems = [];
    this.config.total = pricing.totalNow;

    if (!pricing.hasPrice) return;
    let taxAmount = pricing.price.now.taxes || pricing.price.now.tax;

    lineItems.push(lineItem(this.config.i18n.subtotalLineItemLabel, pricing.subtotalPreDiscountNow));

    if (+pricing.price.now.discount) {
      lineItems.push(lineItem(this.config.i18n.discountLineItemLabel, -pricing.price.now.discount));
    }

    if (+taxAmount) {
      lineItems.push(lineItem(this.config.i18n.taxLineItemLabel, taxAmount));
    }

    if (+pricing.price.now.giftCard) {
      lineItems.push(lineItem(this.config.i18n.giftCardLineItemLabel, -pricing.price.now.giftCard));
    }

    this.config.lineItems = lineItems;
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

    this.recurly.request.post({
      route: '/apple_pay/start',
      data: { validationURL },
      done: (err, merchantSession) => {
        if (err) return this.error(err);
        this.session.completeMerchantValidation(merchantSession);
      }
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

    this.session.completePaymentMethodSelection({
      newTotal: this.finalTotalLineItem,
      newLineItems: this.lineItems,
    });
  }

  /**
   * Handles shipping contact selection. Not utilized
   *
   * @param  {Event} event
   * @private
   */
  onShippingContactSelected (event) {
    const newShippingMethods = [];

    this.emit('shippingContactSelected', event);

    this.session.completeShippingContactSelection({
      newTotal: this.finalTotalLineItem,
      newLineItems: this.lineItems,
      newShippingMethods,
    });
  }

  /**
   * Handles shipping method selection. Not utilized
   *
   * @param  {Event} event
   * @private
   */
  onShippingMethodSelected (event) {
    this.emit('shippingMethodSelected', event);

    this.session.completeShippingMethodSelection({
      newTotal: this.finalTotalLineItem,
      newLineItems: this.lineItems,
    });
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

    let data = {};

    if (this.config.form) {
      data = normalize(this.config.form, FIELDS, { parseCard: false }).values;
    }

    this.emit('paymentAuthorized', event);

    this.mapPaymentData(data, event.payment);

    return this.token(event, data);
  }

  token (event, data) {
    this.recurly.request.post({
      route: '/apple_pay/token',
      data,
      done: (err, token) => {
        if (err) {
          this.session.completePayment({ status: this.session.STATUS_FAILURE });
          return this.error('apple-pay-payment-failure', err);
        }

        debug('Token received', token);

        this.session.completePayment({ status: this.session.STATUS_SUCCESS });
        this.emit('authorized', event);
        this.emit('token', token);
      }
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
    setTimeout(() => this.emit('error', err), 0);
    return err;
  }


  /**
   * Maps data from the Apple Pay token into the inputs
   * object that is sent to RA for tokenization
   *
   * @private
   */
  mapPaymentData (inputs, data) {
    inputs.paymentData = data.token.paymentData;
    inputs.paymentMethod = data.token.paymentMethod;

    if (!data.billingContact) return;
    if (Object.keys(APPLE_PAY_ADDRESS_MAP).some(field => inputs[field])) return;

    FIELDS.forEach(field => {
      if (!APPLE_PAY_ADDRESS_MAP[field]) return;

      let tokenData = data.billingContact[APPLE_PAY_ADDRESS_MAP[field]];

      // address lines are an array from Apple Pay
      if (field === 'address1') tokenData = tokenData[0];
      else if (field === 'address2') tokenData = tokenData[1];

      inputs[field] = tokenData;
    });
  }
}

/**
 * Builds an ApplePayLineItem
 * @param  {String} label
 * @param  {Number} amount
 * @return {object}
 */
function lineItem (label = '', amount = 0) {
  return { label, amount: decimalize(amount) };
}
