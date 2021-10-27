/**
 * Round the second decimal of a number without risk of
 * floating point math errors
 *
 * - returns zero if the result is negative
 *
 * @param {Number} number
 * @return {Number}
 */

export default function taxRound (number) {
  number = Math.max(number, 0);
  return +((number < 0 ? -1 : 1) * Math.round(Math.abs(number) + 'e+2') + 'e-2');
}
