
/*!
 * Module dependencies.
 */

var type = require('type');
var clone = require('clone');
var debug = require('debug')('recurly:tax');

/**
 * expose
 */

module.exports = tax;

/**
 * Tax mixin.
 *
 * Provides a tax estiamte for the given address.
 *
 * @param {Object} options
 * @param {Object} options.postal_code
 * @param {Object} options.country
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
