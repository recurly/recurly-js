
/*!
 * Module dependencies.
 */

var type = require('component-type');
var clone = require('component-clone');

/**
 * expose
 */

module.exports = tax;

/**
 * Tax mixin.
 *
 * Provides a tax estimate for the given address.
 *
 * @param {Object} options
 * @param {Object} options.postal_code
 * @param {Object} options.country
 * @param {Object} [options.tax_code]
 * @param {Object} [options.vat_number] Used for VAT exemptions
 * @param {Function} callback
 */

function tax (options, callback) {
  var request = clone(options);

  if ('function' != type(callback)) {
    throw new Error('Missing callback');
  }

  if (!('currency' in request)) {
    request.currency = this.config.currency;
  }

  this.request('get', '/tax', request, callback);
};
