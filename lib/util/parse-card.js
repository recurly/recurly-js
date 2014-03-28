
/**
 * Removes dashes and spaces from a card number.
 *
 * @param {Number|String} number
 * @return {String} parsed card number
 */

module.exports = function parseCard (number) {
  return number && number.toString().replace(/[-\s]/g, '');
};
