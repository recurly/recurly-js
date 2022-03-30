import { ApplePay } from './apple-pay';
import { ApplePayBraintree } from './apple-pay.braintree';

/**
 * Instantiation factory
 *
 * @param  {Object} options
 * @return {ApplePay}
 */
export function factory (options) {
  const factoryClass = options?.braintree?.clientAuthorization
    ? ApplePayBraintree
    : ApplePay;

  return new factoryClass(Object.assign({}, options, { recurly: this }));
}
