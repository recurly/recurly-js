import Emitter from 'component-emitter';
import errors from './errors';

const debug = require('debug')('recurly:bank-redirect');

/**
 * Instantiation factory.
 *
 * @param  {Object} options
 * @return {BankRedirect}
 */
export function factory (options) {
  return new BankRedirect(Object.assign({}, options, { recurly: this }));
}

/**
 * Initializes a BankRedirect session.
 *
 * @param {Object} options
 * @param {Recurly} options.recurly
 * @constructor
 * @public
 */
class BankRedirect extends Emitter {
  constructor (options) {
    debug('Creating new BankRedirect session');

    super();
    this.recurly = options.recurly;
  }

  /**
   * Fetch the banks.
   * @param {Object} data
   * @param {string} attachTo
   */
  loadBanks (data, attachTo) {
    debug('Load banks');

    const errors = validateBankPayload(data);
    if (errors.length > 0) {
      return this.error('validation', { fields: errors });
    }

    this.recurly.request.get({
      route: '/bank_redirect/banks',
      data,
      done: (error, response) => {
        if (error) {
          return this.error('banks-error', { cause: error });
        }

        if (attachTo) {
          attachListToSelect(attachTo, response.banks, 'issuer_id');
        }
        this.emit('banks', response.banks);
      }
    });
  }

  /**
   * Fetch the countries.
   * @param {Object} data
   * @param {string} attachTo
   */
  loadCountries (data, attachTo) {
    debug('Load countries');

    const errors = validateCountriesPayload(data);
    if (errors.length > 0) {
      return this.error('validation', { fields: errors });
    }

    const countries = [
      { id: 'AT', name: 'Austria' },
      { id: 'BE', name: 'Belgium' },
      { id: 'DE', name: 'Germany' },
      { id: 'IT', name: 'Italy' },
      { id: 'ES', name: 'Spain' },
      { id: 'NL', name: 'The Netherlands' }
    ];
    if (attachTo) {
      attachListToSelect(attachTo, countries, 'country_code');
    }
    this.emit('countries', countries);
  }

  /**
   * Start the BankRedirect Payment Modal.
   * @param {Object} data
  */
  start (data) {
    debug('Start BankRedirect Payment Modal');

    const errors = validatePayload(data);
    if (errors.length > 0) {
      return this.error('validation', { fields: errors });
    }

    const frame = this.recurly.Frame({
      height: 600,
      path: '/bank_redirect/start',
      payload: data
    });
    frame.once('error', cause => this.error('bank-redirect-error', { cause }));
    frame.once('done', token => this.emit('token', token));
    return frame;
  }

  error (...params) {
    const err = params[0] instanceof Error ? params[0] : errors(...params);
    this.emit('error', err);

    return err;
  }
}

function validatePayload (data) {
  const errors = validatePaymentMethodType(data);

  const validation = {
    ideal: validateIdealPayload,
    sofort: validateSofortPayload,
  }[data && data.payment_method_type];
  if (validation) {
    errors.push(...validation(data));
  }

  return errors;
}

function validateBankPayload (data) {
  return validatePaymentMethodType(data);
}

function validateCountriesPayload (data) {
  return validatePaymentMethodType(data);
}

function validatePaymentMethodType (data) {
  if (!data || !data.payment_method_type) {
    return ['payment_method_type cannot be blank'];
  }

  if (data.payment_method_type !== 'ideal' && data.payment_method_type !== 'sofort') {
    return ['invalid payment_method_type'];
  }

  return [];
}

function validateIdealPayload (data) {
  const errors = [];

  if (!data || !data.issuer_id) {
    errors.push('issuer_id cannot be blank');
  }

  if (!data || !data.invoice_uuid) {
    errors.push('invoice_uuid cannot be blank');
  }

  return errors;
}

function validateSofortPayload (data) {
  const errors = [];

  if (!data || !data.country_code) {
    errors.push('country_code cannot be blank');
  }

  if (!data || !data.invoice_uuid) {
    errors.push('invoice_uuid cannot be blank');
  }

  return errors;
}

function attachListToSelect (selector, list, selectorId) {
  let $select = document.querySelector(selector);
  if (!$select) {
    return;
  }

  if ($select.tagName != 'SELECT') {
    const $container = $select;
    $select = document.createElement('select');
    $select.id = selectorId;
    $select.setAttribute('name', selectorId);
    $container.appendChild($select);
  }

  while ($select.options.length > 0) {
    $select.remove(0);
  }

  for (const { id, name } of list) {
    const $option = document.createElement('option');
    $option.appendChild(document.createTextNode(name));
    $option.setAttribute('value', id);
    $select.appendChild($option);
  }
}
