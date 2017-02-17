import Emitter from 'component-emitter';
import {BraintreePayPal} from './braintree';

const debug = require('debug')('recurly:paypal');

/**
 * Instantiation factory
 *
 * @param {Object} options
 * @param {Function} done
 * @return {PayPal}
 */
export function factory (options, done) {
  options = Object.assign({}, options, { recurly: this });
  if (options.braintree) return new BraintreePayPal(options);
  return new PayPal(options);
};

export class PayPal extends Emitter {
  constructor (options) {
    super();
    this.recurly = options.recurly;
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
};
