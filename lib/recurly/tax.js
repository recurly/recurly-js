
/*!
 * Module dependencies.
 */

var type = require('type');
var clone = require('clone');
var debug = require('debug')('recurly:tax');

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

exports.tax = function (options, callback) {
  var request = clone(options);

  if ('function' != type(callback)) {
    throw new Error('Missing callback');
  }

  if (!('currency' in request)) {
    request.currency = this.config.currency;
  }

  this.request('/tax', request, callback);
};
