/*jshint -W058 */

/*!
 * Module dependencies.
 */

var find = require('find');
var trim = require('trim');
var index = require('indexof');
var parseCard = require('../util/parse-card');

/**
 * Card patterns.
 *
 * @private
 */

var types = [
  {
    type: 'discover',
    pattern: /^(6011|622|64[4-9]|65)/,
    lengths: [16]
  },
  {
    type: 'master',
    pattern: /^5[0-5]/,
    lengths: [16]
  },
  {
    type: 'american_express',
    pattern: /^3[47]/,
    lengths: [15]
  },
  {
    type: 'visa',
    pattern: /^4/,
    lengths: [13, 16]
  },
  {
    type: 'jcb',
    pattern: /^35[2-8]\d/,
    lengths: [16]
  },
  {
    type: 'diners_club',
    pattern: /^(30[0-5]|309|36|3[89]|54|55|2014|2149)/,
    lengths: [14]
  }
];

/**
 * Validate mixin.
 *
 * @public
 */

module.exports = {

  /**
   * Validates a credit card number via luhn algorithm.
   *
   * @param {Number|String} number The card number.
   * @return {Boolean}
   * @see https://sites.google.com/site/abapexamples/javascript/luhn-validation
   */

  cardNumber: function (number) {
    var str = parseCard(number);
    var ca, sum = 0, mul = 1;
    var i = str.length;

    while (i--) {
      ca = parseInt(str.charAt(i), 10) * mul;
      sum += ca - (ca > 9) * 9;
      mul ^= 3;
    }

    return sum % 10 === 0 && sum > 0;
  },

  /**
   * Returns the type of the card number as a string.
   *
   * TODO(chrissrogers): Maybe undefined instread of "unknown"?
   *
   * @param {Number|String} number The card number
   * @param {Boolean} partial detect card type on a partial (incomplete) number
   * @return {String} card type
   */

  cardType: function (number, partial) {
    var str = parseCard(number);
    var card = find(types, function (card) {
      return card.pattern.test(str) && (partial || ~index(card.lengths, str.length));
    });
    return card && card.type || 'unknown';
  },

  /**
   * Validates whether an expiry month is present or future.
   *
   * @param {Numer|String} month The 2 digit month
   * @param {Numer|String} year The 2 or 4 digit year
   * @return {Boolean}
   */

  expiry: function (month, year) {
    month = parseInt(month, 10) - 1;
    if (month < 0 || month > 11) return false;
    year = parseInt(year, 10);
    year += year < 100 ? 2000 : 0;

    var expiry = new Date;
    expiry.setYear(year);
    expiry.setDate(1);
    expiry.setHours(0);
    expiry.setMinutes(0);
    expiry.setSeconds(0);
    expiry.setMonth(month + 1);
    return new Date < expiry;
  },

  /**
   * Validates whether a number looks like a cvv.
   *
   * e.g.: '123', '0321'
   *
   * @param {Number|String} number The card verification value
   * @return {Boolean}
   */

  cvv: function (number) {
    number = trim(number + '');
    return /^\d+$/.test(number) && (number.length === 3 || number.length === 4);
  }

};
