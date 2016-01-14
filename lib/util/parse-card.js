/**
 * Removes dashes and spaces from a card number.
 *
 * @param {Number|String} number
 * @return {String} parsed card number
 */

export function parseCard (number) {
  return (number || '').toString().replace(/[-\s]/g, '');
};
