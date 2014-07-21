
/*!
 * Module dependencies.
 */

var debug = require('debug')('recurly:paypal');

/**
 * Paypal mixin.
 *
 * @param {Object} data
 * @param {Function} done callback
 */

exports.paypal = function (data, done) {
  debug('start');
  this.open('/paypal/start', data, done);
};
