import _debug from 'debug';
import Promise from 'promise';

const debug = _debug('recurly:pricing:promise');

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
  // Prevent native Promise.then() from trying to construct PricingPromise
  // without the required `pricing` argument via Symbol.species.
  static get [Symbol.species] () { return Promise; }

  constructor (resolver, pricing) {
    debug('create');
    super(resolver);

    this.pricing = pricing;

    // for each pricing method, create a promise wrapper method
    pricing && pricing.PRICING_METHODS.forEach(met => {
      this[met] = (...args) => this.then(() => pricing[met](...args));
    });
  }

  /**
   * Overrides native Promise.then() to return a PricingPromise that carries
   * the pricing reference (and its attached methods) through the chain.
   * Native Promise uses Symbol.species (not the instance constructor property)
   * to determine the derived promise type, so the old `this.constructor = ...`
   * trick no longer works in a non-transpiled environment.
   */
  then (onFulfilled, onRejected) {
    const { pricing } = this;
    const parent = super.then(onFulfilled, onRejected);
    return new PricingPromise(
      (resolve, reject) => parent.then(resolve, reject),
      pricing
    );
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
