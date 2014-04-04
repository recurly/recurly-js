/**
 * Dependencies
 */

var Promise = require('promise');
var mixin = require('mixin');
var bind = require('bind');
var each = require('each');
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

  var self = this;
  this.pricing = pricing;
  this.constructor = par.rpartial(this.constructor, pricing);

  Promise.call(this, resolver);

  // for each pricing property, create a promise wrapper method
  each(require('./').Pricing.properties, function (method) {
    self[method] = function () {
      return self.then(self.pricing[method].apply(self.pricing, arguments));
    };
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
  this.then(this.reprice);
  Promise.prototype.done.apply(this, arguments);
  return this.pricing;
};

/**
 * Calls pricing reprice
 *
 * @private
 */

PricingPromise.prototype.reprice = function () {
  debug('repricing');
  this.pricing.reprice();
};
