/*jshint -W058 */

import { FIELDS as CARD_FIELDS } from './token';
import each from 'component-each';
import find from 'component-find';
import { parseCard } from '../util/parse-card';
import CREDIT_CARD_TYPES from '../const/credit-card-types.json';

const debug = require('debug')('recurly:validate');

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

export const publicMethods = { cardNumber, cardType, cardCoBrand, expiry, cvv };

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
 * Converts a number to another number to be used in comparison.
 * For example, it converts 38 to 3800 (or 3899), suitable for range
 * comparisons.
 * @param {Integer} start The range start
 * @param {Integer} length Size of the desired range item
 * @param {String} terminator The char used for padding a smaller range
 * @returns {Integer} A range item integer with `length` digits
 */
function buildCompareValue (start, length, terminator) {
  let result = start.toString().substr(0, length);

  // This can be replaced by padEnd after drop IE11 support
  while (result.length < length) {
    result = result + terminator;
  }

  return parseInt(result);
}

/**
 * Returns the type of the card number as a string.
 *
 * @param {Number|String} number The card number
 * @param {Boolean} partial detect card type on a partial (incomplete) number
 * @return {String} card type
 */

export function cardType (number, partial = false) {
  return findCardGroup(number, partial)?.type || 'unknown';
}

function findCardGroup (number, partial) {
  const cardNumber = parseCard(number);

  const types = Object.keys(CREDIT_CARD_TYPES).map(function (type) {
    if (partial && type == 'maestro') {
      // Maestro has a wide range (6*) that overlaps with some other types,
      // which can be disambiguated only when the full lenght is given
      return;
    }

    const group = find(CREDIT_CARD_TYPES[type], ((group) => {
      if (!partial && group.lengths.indexOf(cardNumber.length) < 0) {
        return false;
      }

      return findInRange(group.ranges, cardNumber);
    }));

    if (group) {
      return { type, group };
    }
  }).filter(function (typeWithGroup) { return !!typeWithGroup; });

  return types.length == 1 && types[0];
}

function findInRange (ranges, cardNumber) {
  const compareLength = Math.min(cardNumber.length, 8);
  const compareValue = buildCompareValue(cardNumber, compareLength, '0');

  return find(ranges, ([rangeBegin, rangeEnd]) => {
    const start = buildCompareValue(rangeBegin, compareLength, '0');
    const end = buildCompareValue(rangeEnd, compareLength, '9');

    return compareValue >= start && compareValue <= end;
  });
}

export function cardCoBrand (number) {
  const cardNumber = parseCard(number);
  const coBrands = findCardGroup(cardNumber, false)?.group?.co_brands;

  if (!coBrands) {
    return;
  }

  return find(Object.keys(coBrands), function (coBrand) {
    const ranges = coBrands[coBrand];
    return findInRange(ranges, cardNumber);
  });
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
