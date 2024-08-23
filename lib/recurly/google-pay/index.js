import { GooglePay } from './google-pay';
import { GooglePayBraintree } from './google-pay.braintree';

/**
 * Returns a GooglePay instance.
 *
 * @param  {Object} options
 * @return {GooglePay}
 */
export function factory (options) {
  const factoryClass = options?.braintree?.clientAuthorization
    ? GooglePayBraintree
    : GooglePay;

  return new factoryClass(Object.assign({}, options, { recurly: this }));
}
