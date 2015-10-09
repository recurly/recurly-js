
/*!
 * Module dependencies.
 */

var each = require('each');
var type = require('type');
var index = require('indexof');
var debug = require('debug')('recurly:token');
var normalize = require('../util/normalize');
var errors = require('../errors');

/**
 * expose
 */

module.exports = token;

/**
 * Fields that are sent to API.
 *
 * @type {Array}
 * @private
 */

var fields = [
  'first_name',
  'last_name',
  'address1',
  'address2',
  'country',
  'city',
  'state',
  'postal_code',
  'phone',
  'vat_number',
  'token'
];

var hostedFields = [
  'number',
  'month',
  'year',
  'cvv',
];

/**
 * Generates a token from customer data.
 *
 * The callback signature: `err, response` where `err` is a
 * connection, request, or server error, and `response` is the
 * recurly service response. The generated token is accessed
 * at `response.token`.
 *
 * @param {Object|HTMLFormElement} options Billing properties or an HTMLFormElement
 * with children corresponding to billing properties via 'data-reurly' attributes.
 * @param {HTMLIFrameElement} options.number card number hosted field
 * @param {HTMLIFrameElement} options.month card expiration month hosted field
 * @param {HTMLIFrameElement} options.year card expiration year hosted field
 * @param {HTMLIFrameElement} options.cvv card verification value hosted field
 * @param {String} options.first_name customer first name
 * @param {String} options.last_name customer last name
 * @param {String} [options.address1]
 * @param {String} [options.address2]
 * @param {String} [options.country]
 * @param {String} [options.city]
 * @param {String} [options.state]
 * @param {String|Number} [options.postal_code]
 * @param {Function} done callback
 */

function token (options, done) {
  debug('token');

  var data = normalize(fields, options, { parseCard: true });
  var input = data.values;
  var userErrors = validate.call(this, input);

  if ('function' !== type(done)) {
    throw errors('missing-callback');
  }

  if (userErrors.length) {
    return done(errors('validation', { fields: userErrors }));
  }

  this.request('post', '/token', input, function (err, res) {
    if (err) return done(err);
    if (data.fields.token && res.id) {
      data.fields.token.value = res.id;
    }
    done(null, res);
  });
}

/**
 * Checks user input on a token call
 *
 * @param {Object} input
 * @return {Array} indicates which fields are not valid
 */

function validate (input) {
  var errors = [];

  if (!this.validate.cardNumber(input.number)) {
    errors.push('number');
  }

  if (!this.validate.expiry(input.month, input.year)) {
    errors.push('month', 'year');
  }

  if (!input.first_name) {
    errors.push('first_name');
  }

  if (!input.last_name) {
    errors.push('last_name');
  }

  if (input.cvv && !this.validate.cvv(input.cvv)) {
    errors.push('cvv');
  }

  each(this.config.required, function(field) {
    if (!input[field] && ~index(fields, field)) {
      errors.push(field);
    }
  });

  debug('validate errors', errors);

  return errors;
}
