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
  'fraud_session_id',
  'token'
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

export function token (options, done) {
  debug('token');

  let data = normalize(FIELDS, options, { parseCard: true });
  let inputs = data.values;

  if (!this.configured) {
    throw errors('not-configured');
  }

  if (typeof done !== 'function') {
    throw errors('missing-callback');
  }

  if (this.config.parent) {
    inputs.fraud = this.fraud.params(inputs);

    inputs.browser = Risk.browserInfo;

    if (this.hostedFields.errors.length > 0) {
      throw this.hostedFields.errors[0];
    }

    const id = uid();
    this.bus.send('token:init', { id, inputs });
    this.once(`token:done:${id}`, msg => complete(msg.err, msg.token));
  } else {
    let userErrors = validateCardInputs(this, inputs);
    if (userErrors.length) {
      return done(errors('validation', {
        fields: userErrors.map(e => e.field),
        details: userErrors
      }));
    }

    const bin = inputs.number.substr(0, 6);
    Risk.preflight({ recurly: this, bin })
      .then(results => inputs.risk = results)
      .then(() => this.request.post({ route: '/token', data: inputs, done: complete }))
      .done();
  }

  function complete (err, res) {
    if (err) return done(err);
    if (data.fields.token && res.id) {
      data.fields.token.value = res.id;
    }
    done(null, res);
  }
}
