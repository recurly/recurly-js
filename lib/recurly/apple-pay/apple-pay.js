import Emitter from 'component-emitter';
import errors from '../errors';
import { Pricing } from '../pricing';
import { FIELDS } from '../token';
import PricingPromise from '../pricing/promise';
import { normalize } from '../../util/normalize';
import buildApplePayPaymentRequest from './util/build-apple-pay-payment-request';
import { lineItem } from './util/apple-pay-line-item';

const debug = require('debug')('recurly:apple-pay');

const MINIMUM_SUPPORTED_VERSION = 4;
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
  totalLineItemLabel: 'Total',
  discountLineItemLabel: 'Discount',
  taxLineItemLabel: 'Tax',
  giftCardLineItemLabel: 'Gift card'
};

/**
 * Initializes an Apple Pay session.
 * Accepts all members of ApplePayPaymentRequest with the same name.
 *
 * @param {Object} options
 * @param {Recurly} options.recurly
 * @param {String} options.country
 * @param {String} options.currency
 * @param {String|Object} [options.total] either in dollar format, '1.00', or an ApplePayLineItem object that represents the total for the payment. Optional and discarded if 'pricing' is supplied
 * @param {String} [options.label] The short, localized description of the total charge. Deprecated, use 'i18n.totalLineItemLabel' if not using an ApplePayLineItem as the total
 * @param {HTMLElement} [options.form] to provide additional customer data
 * @param {Pricing} [options.pricing] to provide line items and total from Pricing
 * @param {Boolean} [options.enforceVersion] to ensure that the client supports the minimum version to support required fields
 * @constructor
 * @public
 */

export class ApplePay extends Emitter {
  constructor (options) {
    super();

    this._ready = false;
    this.config = {};
    this.once('ready', () => this._ready = true);

    // Detect whether Apple Pay is available
    if (!(window.ApplePaySession && window.ApplePaySession.supportsVersion(MINIMUM_SUPPORTED_VERSION))) {
      this.initError = this.error('apple-pay-not-supported');
    } else if (!window.ApplePaySession.canMakePayments()) {
      this.initError = this.error('apple-pay-not-available');
    }

    if (!this.initError) {
      this.configure({ ...options });
    }
  }

  /**
   * @return {ApplePaySession} Bound Apple Pay session
   * @private
   */
  get session () {
    if (this._session) return this._session;

    debug('Creating new Apple Pay session', this._paymentRequest);

    const session = new window.ApplePaySession(MINIMUM_SUPPORTED_VERSION, this._paymentRequest);
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
    if (!this._ready) return [];

    // Clone configured line items
    return [].concat(this._paymentRequest.lineItems);
  }

  /**
   * @return {Object} total cost line item
   * @private
   */
  get totalLineItem () {
    if (!this._ready) return {};

    return this._paymentRequest.total;
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
    if (options.recurly) {
      this.recurly = options.recurly;
      delete options.recurly;
    } else return this.initError = this.error('apple-pay-factory-only');

    if (options.form) {
      this.config.form = options.form;
      delete options.form;
    }

    this.config.i18n = {
      ...I18N,
      ...(options.label && { totalLineItemLabel: options.label }),
      ...options.i18n,
    };
    delete options.label;
    delete options.i18n;

    if (options.pricing instanceof PricingPromise) {
      this.config.pricing = options.pricing.pricing;
    } else if (options.pricing instanceof Pricing) {
      this.config.pricing = options.pricing;
    }
    delete options.pricing;

    buildApplePayPaymentRequest(this, options, (err, paymentRequest) => {
      if (err) return this.initError = this.error(err);

      this._paymentRequest = paymentRequest;

      // If pricing is provided, attach change listeners
      if (this.config.pricing) {
        this.onPricingChange();
        this.config.pricing.on('change', () => this.onPricingChange());
      }

      this.emit('ready');
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
  onPricingChange () {
    const { pricing } = this.config;

    this._paymentRequest.total = lineItem(this.config.i18n.totalLineItemLabel, pricing.totalNow);
    this._paymentRequest.lineItems = [];

    if (!pricing.hasPrice) return;
    const taxAmount = pricing.price.now.taxes || pricing.price.now.tax;
    const lineItems = this._paymentRequest.lineItems;

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
      data: { host: window.location.hostname, validationURL },
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
