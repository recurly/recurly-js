import Promise from 'promise';
import mixin from 'mixin';

const debug = require('debug')('recurly:pricing:promise');

/**
 * PricingPromise
 *
 * issues repricing when .done
 *
 * contains .then wrappers for Pricing property methods
 *
 * Usage
 *
 *   let pricing = recurly.Pricing.Subscription();
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
export default class PricingPromise extends Promise {
  constructor (resolver, pricing) {
    debug('create');
    super(resolver);

    this.pricing = pricing;
    this.constructor = resolver => new PricingPromise(resolver, pricing);

    // for each pricing method, create a promise wrapper method
    pricing && pricing.PRICING_METHODS.forEach(met => {
      this[met] = (...args) => this.then(() => pricing[met](...args));
    });
  }

  /**
   * Adds a reprice and completes the control flow
   *
   * @param {Function} onFulfilled
   * @param {Function} onRejected
   * @return {Pricing} bound pricing instance
   * @public
   */
  done (...args) {
    debug('repricing');
    super.done.apply(this.then(this.reprice), args);
    return this.pricing;
  }

  /**
   * Adds a reprice if a callback is passed
   *
   * @param {Function} [done] callback
   * @public
   */
  nodeify (done, ...args) {
    if (typeof done === 'function') this.reprice();
    return super.nodeify.call(this, done, ...args);
  }
}
