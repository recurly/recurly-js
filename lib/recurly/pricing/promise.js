/**
 * Dependencies
 */

var Promise = require('promise');
var mixin = require('mixin');
var bind = require('bind');
var each = require('each');
var type = require('type');
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

  // for each pricing method, create a promise wrapper method
  each(require('./').prototype, function (method) {
    self[method] = function () {
      var args = arguments;
      return self.then(function () {
        return self.pricing[method].apply(self.pricing, args);
      });
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
  if (type(done) === 'function') this.reprice();
  return Promise.prototype.nodeify.apply(this, arguments);
};
