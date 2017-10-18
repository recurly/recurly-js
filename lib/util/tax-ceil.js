/**
 * Ceilings the second decimal of a number without risk of
 * floating point math errors
 *
 * @param {Number} number
 * @return {Number}
 */

export default function taxCeil (number) {
  return +(Math.ceil(number + 'e+2') + 'e-2');
}
