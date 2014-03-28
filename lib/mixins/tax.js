
/*!
 * Module dependencies.
 */

var type = require('type');
var debug = require('debug')('recurly:tax');

/**
 * Tax mixin.
 *
 * Provides a tax estiamte for the given address.
 *
 * TODO: It mentions address above, what all fields are required?
 *
 * @param {Object} options
 * @param {Function} callback
 */

exports.tax = function (options, callback) {
  debug('%j', options);

  if ('function' != type(callback)) {
    throw new Error('Missing callback');
  }

  if (!('currency' in options)) {
    options.currency = this.config.currency;
  }

  this.request('/tax', options, callback);
};
