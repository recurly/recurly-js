
/*!
 * Module dependencies.
 */

var type = require('type');
var mixin = require('mixin');
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
  if ('function' != type(callback)) {
    throw new Error('Missing callback');
  }

  var request = {};
  mixin(request, options);

  if (!('currency' in request)) {
    request.currency = this.config.currency;
  }

  this.request('/tax', request, callback);
};
