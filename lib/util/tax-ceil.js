/**
 * Ceilings the second decimal of a number without risk of
 * floating point math errors
 *
 * - returns zero if the result is negative
 *
 * @param {Number} number
 * @return {Number}
 */

export default function taxCeil (number) {
  number = Math.max(number, 0);
  return +(Math.ceil(number + 'e+2') + 'e-2');
}
