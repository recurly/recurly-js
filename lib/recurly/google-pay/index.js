import { GooglePay } from './google-pay';

/**
 * Returns a GooglePay instance.
 *
 * @param  {Object} options
 * @return {GooglePay}
 */
export function factory (options) {
  const factoryClass = GooglePay;

  return new factoryClass(Object.assign({}, options, { recurly: this }));
}
