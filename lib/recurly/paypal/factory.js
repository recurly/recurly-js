import {PayPal} from './';
import {BraintreePayPal} from './braintree';

/**
 * PayPal instantiation factory
 *
 * @param {Object} options
 * @param {Function} done
 * @return {PayPal}
 */
export function factory (options, done) {
  options = Object.assign({}, options, { recurly: this });
  if (options.braintree) return new BraintreePayPal(options);
  return new PayPal(options);
}
