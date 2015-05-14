
/*!
 * Module dependencies.
 */

var debug = require('debug')('recurly:paypal');

/**
 * expose
 */

module.exports = paypal;

/**
 * Paypal mixin.
 *
 * @param {Object} data
 * @param {Function} done callback
 */

function paypal (data, done) {
  debug('start');
  this.open('/paypal/start', data, done);
}
