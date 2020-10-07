/*jshint -W058 */

import { FIELDS as CARD_FIELDS } from './token';
import each from 'component-each';
import find from 'component-find';
import { parseCard } from '../util/parse-card';

const debug = require('debug')('recurly:validate');

/**
 * Card patterns.
 *
 * @private
 */
const TYPES = [
  {
    type: 'discover',
    pattern: {
      test: (n) => {
        const firstEight = parseInt(n.substr(0, 8), 10);
        const acceptedRanges = [
          [60110000, 60110399],
          [60110500, 60110999],
          [60112000, 60114999],
          [60117400, 60117499],
          [60117700, 60117999],
          [60118600, 60119999],
          [64400000, 65059999],
          [65060100, 65060999],
          [65061100, 65999999]
        ];

        if (!(/^6[045]/.test(firstEight))) return false;
        return validBinRange(acceptedRanges, firstEight);
      }
    },
    lengths: [16, 17, 18, 19]
  },
  {
    type: 'union_pay',
    pattern: {
      test: (n) => {
        const firstEight = parseInt(n.substr(0, 8), 10);
        const acceptedRanges = [
          [62109400, 62109499],
          [62212600, 62292599],
          [62400000, 62699999],
          [62820000, 62889999],
          [81000000, 81099999],
          [81100000, 81319999],
          [81320000, 81519999],
          [81520000, 81639999],
          [81640000, 81719999]
        ];

        if (!(/^6[2]/.test(firstEight)) && !(/^8[1]/.test(firstEight))) return false;
        return validBinRange(acceptedRanges, firstEight);
      }
    },
    lengths: [16, 17, 18, 19]
  },
  {
    type: 'master',
    pattern: {
      test: (n) => {
        let firstSix = parseInt(n.substr(0, 6), 10);
        if (/^5[1-5]/.test(n)) return true;
        if (firstSix >= 222100 && firstSix <= 272099) return true;
        return false;
      }
    },
    lengths: [16]
  },
  {
    type: 'american_express',
    pattern: /^3[47]/,
    lengths: [15]
  },
  {
    type: 'elo',
    pattern: /^(636368|504175|636297|506[67]\d\d)\d{0,10}$/,
    lengths: [13, 16]
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
  },
  {
    type: 'hipercard',
    pattern: /^(606282\d{10}(\d{3})?)|(3841\d{15})$/,
    lengths: [16]
  }
];

/**
 * Validates bin ranges for supported card types
 *
 * @private
 */
function validBinRange (acceptedRanges, firstEight) {
  for (let index = 0; index < acceptedRanges.length; index++) {
    const [min, max] = acceptedRanges[index];
    if (firstEight <= max && firstEight >= min) return true;
  }
  return false;
}

/**
 * Validation error messages
 * @type {String}
 * @private
 */
const INVALID = 'is invalid';
const BLANK = "can't be blank";
const DOES_NOT_MATCH = 'does not match';

/**
 * Fields required by bank account tokenization
 * @type {Array}
 */
const BANK_ACCOUNT_REQUIRED_FIELDS = [
  'account_number',
  'account_number_confirmation',
  'routing_number',
  'account_type',
  'name_on_account',
  'country'
];

/**
 * Fields required by IBAN bank account tokenization
 * @type {Array}
 */
const IBAN_BANK_ACCOUNT_REQUIRED_FIELDS = [
  'iban',
  'name_on_account',
];

/**
 * Fields required by Bacs bank account tokenization
 * @type {Array}
 */
const BACS_BANK_ACCOUNT_REQUIRED_FIELDS = [
  'name_on_account',
  'sort_code',
  'account_number',
  'account_number_confirmation',
];

/**
 * Fields required by BECS bank account tokenization
 * @type {Array}
 */
const BECS_BANK_ACCOUNT_REQUIRED_FIELDS = [
  'account_number',
  'account_number_confirmation',
  'name_on_account',
  'bsb_code',
];

export const publicMethods = { cardNumber, cardType, expiry, cvv };

/**
 * Validates a credit card number via length check and luhn algorithm.
 *
 * @param {Number|String} number The card number.
 * @return {Boolean}
 * @see https://sites.google.com/site/abapexamples/javascript/luhn-validation
 */

export function cardNumber (number) {
  const str = parseCard(number);
  let ca, sum = 0, mul = 1;
  let i = str.length;

  if (i < 12 || i > 19) return false;

  while (i--) {
    ca = parseInt(str.charAt(i), 10) * mul;
    sum += ca - (ca > 9) * 9;
    mul ^= 3;
  }

  return sum % 10 === 0 && sum > 0;
}

/**
 * Returns the type of the card number as a string.
 *
 * @param {Number|String} number The card number
 * @param {Boolean} partial detect card type on a partial (incomplete) number
 * @return {String} card type
 */

export function cardType (number, partial = false) {
  const str = parseCard(number);
  const len = str.length;
  const card = find(TYPES, card => card.pattern.test(str) && (partial || ~card.lengths.indexOf(len)));

  return card && card.type || 'unknown';
}

/**
 * Validates whether an expiry month is present or future.
 *
 * @param {Number|String} month The 2 digit month
 * @param {Number|String} year The 2 or 4 digit year
 * @return {Boolean}
 */

export function expiry (month, year) {
  month = Number(month) - 1;
  if (month < 0 || month > 11) return false;
  year = Number(year);
  year += year < 100 ? 2000 : 0;

  let expiry = new Date;
  expiry.setYear(year);
  expiry.setDate(1);
  expiry.setHours(0);
  expiry.setMinutes(0);
  expiry.setSeconds(0);
  expiry.setMonth(month + 1);
  return new Date < expiry;
}

/**
 * Validates whether a number looks like a cvv.
 *
 * e.g.: '123', '0321'
 *
 * @param {Number|String} number The card verification value
 * @return {Boolean}
 */

export function cvv (number) {
  number = String(number).trim();
  if (!~[3, 4].indexOf(number.length)) return false;
  return /^\d+$/.test(number);
}

/**
 * Checks user input on a card token call
 *
 * @param {Recurly} recurly
 * @param {Object} inputs
 * @return {Array} formatted array of invalid fields with descriptive messages
 */
export function validateCardInputs (recurly, inputs) {
  const format = formatFieldValidationError;
  let errors = [];

  if (!cardNumber(inputs.number)) {
    errors.push(format('number', INVALID));
  }

  if (!expiry(inputs.month, inputs.year)) {
    errors.push(format('month', INVALID), format('year', INVALID));
  }

  if (!inputs.first_name) {
    errors.push(format('first_name', BLANK));
  }

  if (!inputs.last_name) {
    errors.push(format('last_name', BLANK));
  }

  if (~recurly.config.required.indexOf('cvv') && !inputs.cvv) {
    errors.push(format('cvv', BLANK));
  } else if ((~recurly.config.required.indexOf('cvv') || inputs.cvv) && !cvv(inputs.cvv)) {
    errors.push(format('cvv', INVALID));
  }

  each(recurly.config.required, function (field) {
    if (!inputs[field] && ~CARD_FIELDS.indexOf(field)) {
      errors.push(format(field, BLANK));
    }
  });

  debug('validate errors', errors);

  return errors;
}

/**
 * Checks user input on a bank account token call
 *
 * @param {Object} inputs
 * @return {Array} formatted array of invalid fields with descriptive messages
 */
export function validateBankAccountInputs (inputs) {
  const format = formatFieldValidationError;
  let required = [];
  let errors = [];

  if ('iban' in inputs) {
    required = IBAN_BANK_ACCOUNT_REQUIRED_FIELDS;
  } else if (inputs.type === 'bacs') {
    required = BACS_BANK_ACCOUNT_REQUIRED_FIELDS;
    accountNumberMatches(inputs, errors);
  } else if (inputs.type === 'becs') {
    required = BECS_BANK_ACCOUNT_REQUIRED_FIELDS;
    accountNumberMatches(inputs, errors);
  } else {
    required = BANK_ACCOUNT_REQUIRED_FIELDS;
    accountNumberMatches(inputs, errors);
  }

  required.forEach(name => {
    if (!inputs[name]) {
      errors.push(format(name, BLANK));
    } else if (typeof inputs[name] !== 'string') {
      errors.push(format(name, INVALID));
    }
  });

  debug('bank account validate errors', errors);

  return errors;
}

/**
 * Validates a bank account routing number
 * @param  {[type]} routingNumber
 * @return {Array} formatted array of invalid fields with descriptive messages
 */
export function validateBankRoutingNumber (routingNumber) {
  let errors = [];

  if (!routingNumber) {
    errors.push(formatFieldValidationError('routing_number', BLANK));
  } else if (typeof routingNumber !== 'string') {
    errors.push(formatFieldValidationError('routing_number', INVALID));
  }

  debug('validate errors', errors);

  return errors;
}

/**
 * Formats a field validation error
 *
 * @param {string} field
 * @param {String} message
 * @return {Object}
 */
function formatFieldValidationError (field, message) {
  return { field, messages: [message] };
}

function accountNumberMatches (inputs, errors) {
  const format = formatFieldValidationError;

  if (inputs.account_number !== inputs.account_number_confirmation) {
    errors.push(format('account_number_confirmation', DOES_NOT_MATCH));
  }
}
