import decimalize from '../../../util/decimalize';

/**
 * Builds an ApplePayLineItem
 * @param  {String} label
 * @param  {Number} amount
 * @return {object}
 */
export function lineItem (label = '', amount = 0, { recurring = false } = {}) {
  return {
    label,
    amount: decimalize(amount),
    ...(recurring && { paymentTiming: 'recurring' }),
  };
}
