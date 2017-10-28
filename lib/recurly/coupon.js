import errors from '../errors';

const debug = require('debug')('recurly:coupon');

const CHUNK_SIZE = 100;

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
 * @param {Array[String]} [options.plans] plan codes
 * @param {Function} done
 */

export default function coupon (options = {}, done) {
  debug('%j', options);

  let {coupon, plans, plan, currency} = options;

  if (!coupon) throw errors('missing-coupon');
  if (typeof done !== 'function') throw errors('missing-callback');

  if (!plans && plan) plans = [plan];

  // TODO: this method needs to return the first single result and ignore 404s
  this.pipedRquest(
    'get', `/coupons/${coupon}`,
    { plan_codes: plans, currency },
    by: 'plan_codes',
    size: CHUNK_SIZE,
    done: (err, res) => {
      if (err) return done(err);
      else return done(res[0]);
    }
  );
}
