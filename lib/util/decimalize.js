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
  const sign = number < 0 ? -1 : 1;
  const [mantissa, exponent] = Math.abs(number).toExponential().split('e');
  const shiftedExponent = Number(exponent) + digits;
  const rounded = Math.round(Number(`${mantissa}e${shiftedExponent}`));
  return sign * Number(`${rounded}e-${digits}`);
}

// Applies a rate discount in integer cents, matching the billing API, so the
// discount is a whole cent and the total it is subtracted from stays exact.
export function roundRateDiscount (amount, rate) {
  return round(round(amount * 100, 0) * rate / 100);
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
