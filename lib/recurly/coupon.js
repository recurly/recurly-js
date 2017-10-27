import errors from '../errors';

const debug = require('debug')('recurly:coupon');

/**
 * Coupon mixin.
 *
 * Retrieves coupon information for the `coupon` and optional `plan`.
 * The `callback` signature is `err, coupon` where `err` may be a request
 * or server error, and `coupon` is a representation of the requested coupon.
 *
 * @param {Object} options
 * @param {String} options.coupon coupon code
 * @param {String} [options.plan] plan code
 * @param {Function} done
 */

export default function coupon (options = {}, done) {
  debug('%j', options);

  const {coupon: coupon_code, plan: plan_id, currency} = options;

  if (typeof done !== 'function') {
    throw errors('missing-callback');
  }

  if (!coupon_code) throw errors('missing-coupon');

  this.request('get', `/coupons/${coupon_code}`, { plan_id, currency }, done);
}
