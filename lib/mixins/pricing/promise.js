/**
 * Dependencies
 */

var Promise = require('promise');
var mixin = require('mixin');
var par = require('par');
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
 * @param {Function} resolver
 * @param {Pricing} [pricing]
 */

function PricingPromise (resolver, pricing) {
  if (!(this instanceof PricingPromise)) return new PricingPromise(resolver, pricing);
  if (pricing) {
    this.pricing = pricing;
    this.constructor = par.rpartial(this.constructor, pricing);
  }
  Promise.call(this, resolver);
}

mixin(PricingPromise.prototype, Promise.prototype);

PricingPromise.prototype.constructor = PricingPromise;

PricingPromise.prototype.done = function () {
  var self = this;

  this.then(reprice);

  return Promise.prototype.done.apply(this, arguments);

  function reprice () {
    debug('done: reprice?');
    if (self.pricing) {
      debug('done: reprice!');
      self.pricing.reprice();
    }
  }
};
