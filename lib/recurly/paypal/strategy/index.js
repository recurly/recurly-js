import pick from 'lodash.pick';
import Emitter from 'component-emitter';
import { Recurly } from '../../../recurly';
import { Pricing } from '../../pricing';
import errors from '../../errors';

const debug = require('debug')('recurly:paypal:strategy');

const DISPLAY_OPTIONS = [
  'amount',
  'currency',
  'displayName',
  'locale',
  'enableShippingAddress',
  'shippingAddressOverride',
  'shippingAddressEditable',
  'billingAgreementDescription',
  'landingPageType',

  // Not compatible with Braintree options due to lack of support
  'logoImageUrl',
  'headerImageUrl'
];
const DEFAULTS = {
  display: {
    locale: 'en_US'
  }
};

/**
 * PayPal base interface strategy
 *
 * @abstract
 */
export class PayPalStrategy extends Emitter {
  constructor (options) {
    super();
    this.isReady = false;
    this.config = {};

    this.once('ready', () => this.isReady = true);

    this.configure(options);
  }

  ready (done) {
    if (this.isReady) done();
    else this.once('ready', done);
  }

  configure (options) {
    if (!(options.recurly instanceof Recurly)) throw this.error('paypal-factory-only');
    this.recurly = options.recurly;
    if (options.gatewayCode) this.config.gatewayCode = options.gatewayCode;

    this.config.display = {};

    // PayPal EC flow display customization
    if (typeof options.display === 'object') {
      this.config.display = pick(options.display, DISPLAY_OPTIONS);
    }

    if (!this.config.display.locale) this.config.display.locale = DEFAULTS.display.locale;

    // Bind pricing information to display options
    if (options.pricing instanceof Pricing) {
      this.pricing = options.pricing;
      this.pricing.on('change', () => this.updatePriceFromPricing());
      if (this.pricing.hasPrice) this.updatePriceFromPricing();
    }
  }

  initialize () {
    debug("Method 'initialize' not implemented");
  }

  /**
   * Starts the PayPal flow
   * > must be on the call chain with a user interaction (click, touch) on it
   */
  start () {
    debug("Method 'start' not implemented");
  }

  cancel () {
    this.emit('cancel');
  }

  /**
   * Registers or immediately invokes a failure handler
   *
   * @param {Function} done Failure handler
   */
  onFail (done) {
    if (this.failure) done();
    else this.once('fail', done);
  }

  /**
   * Logs and announces a failure to initialize a strategy
   *
   * @private
   * @param  {String} reason
   * @param  {Object} [options]
   */
  fail (reason, options) {
    if (this.failure) return;
    debug('Failure scenario encountered', reason, options);
    const failure = this.failure = this.error(reason, options);
    this.emit('fail', failure);
  }

  /**
   * Creates and emits a RecurlyError
   *
   * @protected
   * @param  {...Mixed} params to be passed to the Recurlyerror factory
   * @return {RecurlyError}
   * @emit 'error'
   */
  error (...params) {
    let err = params[0] instanceof Error ? params[0] : errors(...params);
    this.emit('error', err);
    return err;
  }

  /**
   * Updates price information from a Pricing instance
   *
   * @private
   */
  updatePriceFromPricing () {
    this.config.display.amount = this.pricing.totalNow;
    this.config.display.currency = this.pricing.currencyCode;
  }
}
