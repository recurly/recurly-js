import { googlePay } from './google-pay';

/**
 * Returns a GooglePay instance.
 *
 * @param  {Object} options
 * @return {GooglePay}
 */
export function factory (options) {
  const recurly = this;

  return googlePay(recurly, options);
}
