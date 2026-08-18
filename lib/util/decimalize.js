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
 * Rounds a rate (percentage) discount to the nearest cent the way the billing
 * API does: the discountable amount is reduced to integer cents before the rate
 * is applied, so a half-cent result rounds to the nearest cent instead of
 * drifting down through floating point dollar math. For example 15% of 34.90 is
 * 5.24, not 5.23 (34.90 * 0.15 evaluates to 5.234999… as a dollar float).
 *
 * @param {Number} amount discountable amount in the major unit (e.g. dollars)
 * @param {Number} rate discount rate (e.g. 0.15)
 * @return {Number} discount in the major unit, rounded to the nearest cent
 */
export function roundRateDiscount (amount, rate) {
  const cents = Math.round(amount * 100) * rate;
  return round(cents / 100);
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
