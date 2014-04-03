/**
 * Dependencies
 */

var Promise = require('promise');
var mixin = require('mixin');
var debug = require('debug')('recurly:pricing:promise');

/**
 * Expose
 */

module.exports = PricingPromise;

/**
 * PricingPromise
 *
 * issues repricing when .done
 *
 * FIXME
 *  - Need to implement a .then that will pass the pricing property
 *    to the fresh promise
 *
 * @param {Function} resolver
 * @param {Pricing} [pricing]
 */

function PricingPromise (resolver, pricing) {
  if (!(this instanceof PricingPromise)) return new PricingPromise(resolver);
  if (pricing) this.pricing = pricing;
  Promise.call(this, resolver);
}

mixin(PricingPromise.prototype, Promise.prototype);

PricingPromise.prototype.constructor = PricingPromise;

PricingPromise.prototype.then = function () {
  return Promise.prototype.then.apply(this, arguments);
};

PricingPromise.prototype.done = function (onResolved, onRejected) {
  debug('done');
  var self = this;

  this.then(reprice);

  return Promise.prototype.done.apply(this, arguments);

  function reprice () {
    if (self.pricing) {
      debug('done:reprice');
      self.pricing.reprice();
    }
  }
};
