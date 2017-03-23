import pick from 'lodash.pick';
import Emitter from 'component-emitter';
import {Recurly} from '../../recurly';
import Pricing from '../pricing';
import errors from '../../errors';

const debug = require('debug')('recurly:paypal');

const DISPLAY_OPTIONS = [
  'useraction',
  'amount',
  'currency',
  'displayName',
  'locale',
  'enableShippingAddress',
  'shippingAddressOverride',
  'shippingAddressEditable',
  'billingAgreementDescription',
  'landingPageType'
];

export class PayPal extends Emitter {
  constructor (options) {
    super();
    this.once('ready', () => this.readyState = 1)
    this.readyState = 0;
    this.config = {};
    this.configure(options);
  }

  ready (done) {
    if (this.readyState > 0) done();
    else this.once('ready', done);
  }

  configure (options) {
    if (!(options.recurly instanceof Recurly)) return this.error('paypal-factory-only');
    this.recurly = options.recurly;

    this.config.constructorOptions = options;
    this.config.display = {};

    // PayPal EC flow display customization
    if (typeof options.display === 'object') {
      this.config.display = pick(options.display, DISPLAY_OPTIONS);
    }

    // Bind pricing information to display options
    if (options.pricing instanceof Pricing) {
      this.pricing = options.pricing;

      // Set initial price if available
      if (this.pricing.price) {
        this.config.display.amount = this.pricing.price.now.total;
        this.config.display.currency = this.pricing.price.currency.code;
      }

      // React to price changes
      this.pricing.on('change', price => {
        this.config.display.amount = price.now.total;
        this.config.display.currency = price.currency.code;
      });
    }
  }

  /**
   * Pass-through for now to deprecated paypal opener method
   */
  start (data) {
    deprecatedPaypal.apply(this.recurly, data, (err, token) => {
      if (err) this.error('paypal-tokenize-error', { err });
      else this.emit('token', token);
    });
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

/**
 * Deprecated Paypal mixin.
 *
 * @deprecated
 * @param {Object} data
 * @param {Function} done callback
 */

export function deprecatedPaypal (data, done) {
  debug('start');
  this.open('/paypal/start', data, done);
}
