import Emitter from 'component-emitter';
import errors from './errors';

const debug = require('debug')('recurly:adyen');

/**
 * Instantiation factory
 *
 * @param  {Object} options
 * @return {Adyen}
 */
export function factory (options) {
  return new Adyen(Object.assign({}, options, { recurly: this }));
}


/**
 * Initializes an Adyen session.
 *
 * @param {Object} options
 * @param {Recurly} options.recurly
 * @constructor
 * @public
 */
class Adyen extends Emitter {
  constructor (options) {
    debug('Creating new Adyen session');
    super();
    this.recurly = options.recurly;
  }

  /**
   * Invokes the Adyen Payment Modal
   * @param {Object} opts
   * @param {String} opts.invoiceUuid - invoice Uuid from PendingPurchase
   * @param {String} [opts.countryCode] - 2 Digit Country Code
   * @param {String} [opts.shopperLocale] - shopperLocale for Payment Modal
   * @param {String} [opts.skinCode] - Skin code provided by Adyen
  */
  start (opts) {
    debug('Invoking Adyen Modal');

    const payload = {
      invoiceUuid: opts.invoiceUuid,
      countryCode: opts.countryCode,
      shopperLocale: opts.shopperLocale,
      skinCode: opts.skinCode
    };

    var errors = validatePayload(payload);

    if (errors.length > 0) {
      return this.error('validation', { fields: errors });
    }

    const frame = this.recurly.Frame({ height: 600, path: '/adyen/start', payload });
    frame.once('error', cause => this.error('adyen-error', { cause }));
    frame.once('done', token => this.emit('token', token));
  }

  error (...params) {
    let err = params[0] instanceof Error ? params[0] : errors(...params);
    this.emit('error', err);
    return err;
  }
}

function validatePayload (payload) {
  var errors = [];

  if (payload.skinCode && payload.skinCode.length != 8) {
    errors.push('skinCode should be 8 characters');
  }

  if (payload.countryCode && payload.countryCode.length != 2) {
    errors.push('countryCode should be 2 characters');
  }

  if (payload.shopperLocale && payload.shopperLocale.length != 5) {
    errors.push('shopperLocale should be 5 characters');
  }

  if (!payload.invoiceUuid) {
    errors.push('invoiceUuid cannot be blank');
  }

  debug('validate errors', errors);

  return errors;
}
