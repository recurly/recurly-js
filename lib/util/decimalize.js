/**
 * Applies a decimal transform
 *
 * @param {Number} number to transform
 */

export default function decimalize (number) {
  return (Math.round(number * 100) / 100).toFixed(2);
}
