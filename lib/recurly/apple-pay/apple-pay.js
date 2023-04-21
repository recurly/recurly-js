import Emitter from 'component-emitter';
import errors from '../errors';
import { normalize } from '../../util/normalize';
import { NON_ADDRESS_FIELDS } from '../token';
import { Pricing } from '../pricing';
import PricingPromise from '../pricing/promise';
import { lineItem } from './util/apple-pay-line-item';
import { transformAddress } from './util/transform-address';
import buildApplePayPaymentRequest from './util/build-apple-pay-payment-request';
import finalizeApplePayPaymentRequest from './util/finalize-apple-pay-payment-request';

const debug = require('debug')('recurly:apple-pay');

const MINIMUM_SUPPORTED_VERSION = 4;

const I18N = {
  subtotalLineItemLabel: 'Subtotal',
  totalLineItemLabel: 'Total',
  discountLineItemLabel: 'Discount',
  taxLineItemLabel: 'Tax',
  giftCardLineItemLabel: 'Gift card'
};

const CALLBACK_EVENT_MAP = {
  onPaymentMethodSelected: 'paymentMethodSelected',
  onShippingContactSelected: 'shippingContactSelected',
  onShippingMethodSelected: 'shippingMethodSelected',
  onPaymentAuthorized: 'paymentAuthorized'
};

const UPDATE_PROPERTIES = [
  'newTotal', 'newLineItems', 'newRecurringPaymentRequest',
];

/**
 * Initializes an Apple Pay session.
 * Accepts all members of ApplePayPaymentRequest with the same name.
 *
 * @param {Object} options
 * @param {Recurly} options.recurly
 * @param {String} options.country
 * @param {String} options.currency
 * @param {String} [options.total] total for the payment in dollar format, eg: '1.00'. Optional and discarded if 'pricing' is supplied
 * @param {String} [options.label] The short, localized description of the total charge. Deprecated, use 'i18n.totalLineItemLabel'
 * @param {Boolean} [options.recurring] whether or not the total line item is recurring
 * @param {Object} [options.paymentRequest] an ApplePayPaymentRequest
 * @param {Object} [options.callbacks] callbacks for ApplePay selection events
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

    const paymentRequest = finalizeApplePayPaymentRequest(this._paymentRequest, this.config);
    debug('Creating new Apple Pay session', paymentRequest);

    const session = new window.ApplePaySession(MINIMUM_SUPPORTED_VERSION, paymentRequest);
    session.oncancel = this.onCancel.bind(this);
    session.onvalidatemerchant = this.onValidateMerchant.bind(this);
    session.onpaymentmethodselected = makeCallback(this, 'onPaymentMethodSelected');
    session.onshippingcontactselected = makeCallback(this, 'onShippingContactSelected');
    session.onshippingmethodselected = makeCallback(this, 'onShippingMethodSelected');
    session.onpaymentauthorized = this.token.bind(this);

    return this.session = session;
  }

  /**
   * Resets the session
   * @private
   */
  set session (session) {
    UPDATE_PROPERTIES.forEach(p => delete this[p]);
    this._session = session;
  }

  /**
   * @return {Object} recurring payment request for display on payment sheet
   * @private
   */
  get recurringPaymentRequest () {
    return this.newRecurringPaymentRequest ?? this._paymentRequest?.recurringPaymentRequest;
  }

  /**
   * @return {Array} subtotal line items for display on payment sheet
   * @private
   */
  get lineItems () {
    return this.newLineItems ?? this._paymentRequest?.lineItems ?? [];
  }

  /**
   * @return {Object} total cost line item
   * @private
   */
  get totalLineItem () {
    return this.newTotal ?? this._paymentRequest?.total ?? {};
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
    if (options.recurly) this.recurly = options.recurly;
    else return this.initError = this.error('apple-pay-factory-only');

    if (options.callbacks) this.config.callbacks = options.callbacks;
    if (options.form) this.config.form = options.form;
    if ('recurring' in options) this.config.recurring = options.recurring;

    this.config.i18n = {
      ...I18N,
      ...(options.label && { totalLineItemLabel: options.label }),
      ...options.i18n,
    };

    if (options.pricing instanceof PricingPromise) {
      this.config.pricing = options.pricing.pricing;
    } else if (options.pricing instanceof Pricing) {
      this.config.pricing = options.pricing;
    }

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
    if (this.config.pricing) {
      const { address, shippingAddress } = this.config.pricing.items;
      this._savedPricingState = { address, shippingAddress };
    }

    delete this._session;
    this.session.begin();
  }

  /**
   * Updates line items and total price from the pricing module
   *
   * @param  {Object} price Pricing.price
   * @private
   */
  onPricingChange () {
    const { pricing, recurring } = this.config;

    this._paymentRequest.total = lineItem(this.config.i18n.totalLineItemLabel, pricing.totalNow, { recurring });
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
    debug('validateMerchant', event);

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
   * sets the `contact` to the proper address on the pricing object.
   *
   * @param {string} addressType 'shippingAddress' or 'address'
   * @param {object} contact The Apple Pay contact
   * @param {Function} done
   * @private
   */
  setAddress (addressType, contact, done) {
    if (!contact || !this.config.pricing) return done?.();

    const address = transformAddress(contact, { to: 'address', except: ['emailAddress'] });

    return this.config.pricing[addressType](address).done(done);
  }

  /**
   * Stores the updates if any and completes the Apple Pay selection
   * @param {Function} onComplete the session completion function
   * @param {object} [update] the Apple Pay update object
   * @private
   */
  completeSelection (onComplete, { errors, ...update } = {}) {
    if (update?.total && !update.newTotal) {
      update.newTotal = { ...this.totalLineItem, amount: update.total };
    }

    if (update?.newRecurringPaymentRequest) {
      // Ensure that the newRecurringPaymentRequest has the required properties
      // from the recurringPaymentRequest stored from initialization.
      update.newRecurringPaymentRequest = {
        managementURL: this.recurringPaymentRequest?.managementURL,
        paymentDescription: this.recurringPaymentRequest?.paymentDescription,
        ...update.newRecurringPaymentRequest,
      };
    } else if (this.recurringPaymentRequest && update?.newTotal?.paymentTiming === 'recurring') {
      // Ensure the recurringPaymentRequest is updated with the new total
      // if not provided.
      update.newRecurringPaymentRequest = {
        ...this.recurringPaymentRequest,
        regularBilling: update.newTotal,
      };
    }

    UPDATE_PROPERTIES.forEach(p => this[p] = update?.[p] ?? this[p]);

    onComplete.call(this.session, {
      newTotal: this.finalTotalLineItem,
      newLineItems: this.lineItems,
      newRecurringPaymentRequest: this.recurringPaymentRequest,
      ...((typeof errors === 'object' && errors.length > 0) && { errors: errors.map(makeApplePayError) }),
      ...update,
    });
  }

  /**
   * Handles payment method selection
   *
   * @param  {Event} event
   * @private
   */
  onPaymentMethodSelected ({ paymentMethod: { billingContact } }, update) {
    this.setAddress('address', billingContact, () => {
      this.completeSelection(this.session.completePaymentMethodSelection, update);
    });
  }

  /**
   * Handles shipping contact selection. Not utilized
   *
   * @param  {Event} event
   * @private
   */
  onShippingContactSelected ({ shippingContact }, update) {
    this.setAddress('shippingAddress', shippingContact, () => {
      this.completeSelection(this.session.completeShippingContactSelection, update);
    });
  }

  /**
   * Handles shipping method selection. Not utilized
   *
   * @param  {Event} event
   * @private
   */
  onShippingMethodSelected (event, update) {
    this.completeSelection(this.session.completeShippingMethodSelection, update);
  }

  /**
   * Handles payment authorization. Submits payment token and
   * emits the resultant authorization token
   *
   * @param  {Event} event
   * @emit 'token'
   * @private
   */
  onPaymentAuthorized (event, { errors } = {}) {
    if (typeof errors === 'object' && errors.length > 0) {
      this.session.completePayment({ status: this.session.STATUS_FAILURE, errors: errors.map(makeApplePayError) });
      return;
    }

    this.session.completePayment({ status: this.session.STATUS_SUCCESS });
    this.emit('authorized', event); // deprecated
    this.emit('token', event.payment.recurlyToken, event);
  }

  token (event) {
    const data = this.mapPaymentData(event);

    this.recurly.request.post({
      route: '/apple_pay/token',
      data,
      done: (err, token) => {
        if (err) {
          debug('tokenization error', err);
          this.session.completePayment({ status: this.session.STATUS_FAILURE });
          return this.error('apple-pay-payment-failure', err);
        }

        debug('Token received', token);

        event.payment.recurlyToken = token;
        makeCallback(this, 'onPaymentAuthorized')(event);
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
    restorePricing(this.config.pricing, this._savedPricingState, () => this.emit('cancel', event));
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

  /*
   * Maps data from the Apple Pay token into the token input
   * object that is sent to RA for toenization
   *
   * @private
   */
  mapPaymentData (event) {
    const {
      billingContact,
      token: { paymentData, paymentMethod },
    } = event.payment;

    return {
      paymentData,
      paymentMethod,
      ...(this.config.form && normalize(this.config.form, NON_ADDRESS_FIELDS, { parseCard: false }).values),
      ...transformAddress(billingContact, { to: 'address', except: ['emailAddress'] }),
    };
  }
}

function makeCallback (applePay, callbackName) {
  const callback = applePay.config.callbacks?.[callbackName];
  const eventName = CALLBACK_EVENT_MAP[callbackName];
  const handler = applePay[callbackName].bind(applePay);

  return function (event) {
    debug(eventName, event);
    applePay.emit(eventName, event);
    runCallback(callback, event, handler);
  };
}

function runCallback (callback, event, done) {
  const retVal = callback?.(event);

  if (typeof retVal?.then === 'function') {
    retVal.catch(errors => ({ errors })).then(val => done(event, val));
  } else {
    done(event, retVal);
  }
}

function makeApplePayError ({ code, contactField, message }) {
  return new window.ApplePayError(code, contactField, message);
}

function restorePricing (pricing, state, done) {
  if (!pricing) return done();

  let promise;
  const { address, shippingAddress } = state;

  if (pricing.items.address !== address) promise = (promise || pricing).address(address);
  if (pricing.items.shippingAddress !== shippingAddress) promise = (promise || pricing).shippingAddress(shippingAddress);

  return promise ? promise.done(done) : done();
}
