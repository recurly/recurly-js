
/*!
 * Module dependencies.
 */

var type = require('type');
var debug = require('debug')('recurly:coupon');
var errors = require('../errors');

/**
 * expose
 */

module.exports = coupon;

/**
 * Coupon mixin.
 *
 * Retrieves coupon information for the `plan`. The `callback` signature
 * is `err, plan` where `err` may be a request or server error, and `plan`
 * is a representation of the requested plan.
 *
 * @param {Object} options
 * @param {Function} callback
 */

function coupon (options, callback) {
  debug('%j', options);

  if ('function' !== type(callback)) {
    throw errors('missing-callback');
  }

  if ('object' !== type(options)) {
    throw errors('invalid-options');
  }

  if (!('plan' in options)) {
    throw errors('missing-plan');
  }

  if (!('coupon' in options)) {
    throw errors('missing-coupon');
  }

  this.request('get', '/plans/' + options.plan + '/coupons/' + options.coupon, options, callback);
}
