export function clampToZero (number) {
  return number < 0 ? 0 : number;
}

/**
 * Round the second decimal of a number without risk of
 * floating point math errors
 *
 * @param {Number} number
 * @return {Number}
 */
export function round (number, digits = 2) {
  const rounded = +((number < 0 ? -1 : 1) * Math.round(Math.abs(number) + 'e+2') + 'e-2');
  return parseFloat(rounded.toFixed(digits));
}

/**
 * Applies a decimal transform on an object's member
 *
 * @param {String} prop Property on {this} to transform
 * @this {Object} on which to apply decimal transformation
 */

export function decimalizeMember (prop) {
  if (typeof this[prop] !== 'number') return;
  this[prop] = decimalize(this[prop]);
}

/**
 * Applies a decimal transform
 *
 * @param {Number} number to transform
 */
export default function decimalize (number, digits = 2) {
  return round(number, digits).toFixed(digits);
}
