import decimalize from '../../../util/decimalize';

/**
 * Builds an ApplePayLineItem
 * @param  {String} label
 * @param  {Number} amount
 * @return {object}
 */
export function lineItem (label = '', amount = 0) {
  return { label, amount: decimalize(amount) };
}

/**
 * Determine if the val is a valid ApplePayLineItem
 * @param {object} val
 * @return {boolean}
 */
export function isLineItem (val) {
  return typeof val === 'object' && val.label !== undefined && val.amount !== undefined;
}
