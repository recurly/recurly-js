import Element from './element';
import Elements from './elements';
import errors from './errors';
import { normalize } from '../util/normalize';
import { Risk } from './risk';
import uid from '../util/uid';
import { validateCardInputs } from './validate';

const debug = require('debug')('recurly:token');

/**
 * Fields that are sent to API.
 *
 * @type {Array}
 * @private
 */

export const FIELDS = [
  'first_name',
  'last_name',
  'address1',
  'address2',
  'company',
  'country',
  'city',
  'state',
  'postal_code',
  'phone',
  'vat_number',
  'tax_identifier',
  'tax_identifier_type',
  'fraud_session_id',
  'token'
];

/**
 * Parses the token call signature to determine the form of tokenization to perform,
 * then passes the customer data on for tokenization
 *
 * == When tokenizing Elements ==
 *
 * @param {[Elements]} elements An Elements instance containing one tokenizable Element
 * @param {HTMLFormElement|Object} customerData An HTMLFormElement whose children correspond to
 *                                              billing properties via their 'data-recurly'
 *                                              attributes, or an Object containing customer data
 *                                              (see customerData object).
 * @param {Function} done callback
 *
 *
 * == When tokenizing Hosted Fields ==
 *
 * @param {HTMLFormElement} customerData An HTMLFormElement whose children correspond to billing
 *                                       properties via their 'data-recurly' attributes, or an Object
 *                                       containing customer data (see customerData object).
 * @param {Function} done callback
 *
 *
 * == customerData {Object} ==
 *
 * @param {String} [first_name] customer first name
 * @param {String} [last_name] customer last name
 * @param {String} [address1]
 * @param {String} [address2]
 * @param {String} [country]
 * @param {String} [city]
 * @param {String} [state]
 * @param {String|Number} [postal_code]
 * @param {String} [phone]
 * @param {String} [vat_number]
 * @param {String} [tax_identifier]
 * @param {String} [tax_identifier_type]
 */

export function tokenDispatcher (...args) {
  let bus, elements, customerData, done;

  // signature variance
  if (args[0] instanceof Elements) {
    [elements, customerData, done] = args;
  } else {
    [customerData, done] = args;
  }


  // Try to find the implied Elements if given an HTMLFormElement
  if (!elements && (customerData instanceof HTMLFormElement)) {
    const impliedElement = Element.findElementInDOMTree(customerData);
    if (impliedElement) {
      elements = impliedElement.elements;
    }
  }

  bus = elements ? elements.bus : this.bus;

  // Basic validations
  if (!this.configured) {
    throw errors('not-configured');
  }

  if (typeof done !== 'function') {
    throw errors('missing-callback');
  }

  // TODO: unified error message for lack of elements and hosted fields within
  // tokenizing form

  // We perform this hosted field health check here in order to retain
  // the generic nature of the token method
  if (this.config.parent && !elements && this.hostedFields.errors.length > 0) {
    throw this.hostedFields.errors[0];
  }

  customerData = normalize(customerData, FIELDS, { parseCard: true });

  return token.call(this, customerData, bus, done);
}

/**
 * Generates a token from customer data.
 *
 * The callback signature is `err, response` where `err` is a
 * connection, request, or server error, and `response` is the
 * recurly service response. The generated token is accessed
 * at `response.token`.
 *
 * When using Elements
 *
 * @param {Object} customerData Billing properties
 * @param {Elements} options.elements an Elements instance containing one tokenizable Element
 * @param {HTMLFormElement} [options.form] whose children correspond to billing properties via their
 *                                       'data-recurly' attributes
 *
 * @param {Function} done callback
 *
 *
 * When using Hosted Fields
 *
 * @param {HTMLFormElement} options An HTMLFormElement whose children correspond to billing
 *                                  properties via their 'data-recurly' attributes
 * @param {Function} done callback
 */
function token (customerData, bus, done) {
  debug('token');

  const inputs = customerData.values;

  if (this.config.parent) {
    inputs.fraud = this.fraud.params(inputs);
    inputs.browser = Risk.browserInfo;

    const id = uid();
    this.once(`token:done:${id}`, msg => complete(msg.err, msg.token));
    bus.send('token:init', { id, inputs });
  } else {
    const userErrors = validateCardInputs(this, inputs);
    if (userErrors.length) {
      return done(errors('validation', {
        fields: userErrors.map(e => e.field),
        details: userErrors
      }));
    }

    const { number, month, year } = inputs;
    Risk.preflight({ recurly: this, number, month, year })
      .then(results => inputs.risk = results)
      .then(() => this.request.post({ route: '/token', data: inputs, done: complete }))
      .done();
  }

  function complete (err, res) {
    if (err) return done(err);
    if (customerData.fields.token && res.id) {
      customerData.fields.token.value = res.id;
    }
    done(null, res);
  }
}
