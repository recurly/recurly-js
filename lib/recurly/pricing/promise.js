import Promise from 'promise';
import mixin from 'mixin';
import partialRight from 'lodash.partialright';

const debug = require('debug')('recurly:pricing:promise');

module.exports = PricingPromise;

/**
 * PricingPromise
 *
 * issues repricing when .done
 *
 * contains .then wrappers for Pricing property methods
 *
 * Usage
 *
 *   var pricing = recurly.Pricing();
 *
 *   pricing
 *     .plan('basic')
 *     .addon('addon1')
 *     .then(process)
 *     .catch(errors)
 *     .done();
 *
 * @param {Function} resolver
 * @param {Pricing} pricing bound instance
 * @constructor
 * @public
 */

function PricingPromise (resolver, pricing) {
  if (!(this instanceof PricingPromise)) return new PricingPromise(resolver, pricing);
  debug('create');

  this.pricing = pricing;
  this.constructor = partialRight(this.constructor, pricing);

  Promise.call(this, resolver);

  // for each pricing method, create a promise wrapper method
  pricing && pricing.PRICING_METHODS.forEach(met => {
    this[met] = (...args) => this.then(() => pricing[met](...args));
  });
}

mixin(PricingPromise.prototype, Promise.prototype);
PricingPromise.prototype.constructor = PricingPromise;

/**
 * Adds a reprice and completes the control flow
 *
 * @param {Function} onFulfilled
 * @param {Function} onRejected
 * @return {Pricing} bound pricing instance
 * @public
 */

PricingPromise.prototype.done = function () {
  debug('repricing');
  Promise.prototype.done.apply(this.then(this.reprice), arguments);
  return this.pricing;
};

/**
 * Adds a reprice if a callback is passed
 *
 * @param {Function} [done] callback
 * @public
 */

PricingPromise.prototype.nodeify = function (done) {
  if (typeof done === 'function') this.reprice();
  return Promise.prototype.nodeify.apply(this, arguments);
};
