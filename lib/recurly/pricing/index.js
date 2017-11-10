import Emitter from 'component-emitter';
import find from 'component-find';
import PricingPromise from './promise';
import errors from '../../errors';
import decimalize from '../../util/decimalize'

const debug = require('debug')('recurly:pricing');

export class Pricing extends Emitter {
  constructor (recurly) {
    super();
    this.recurly = recurly;
    this.debug = debug;
    this.reset();
    // TODO: Add reprice call here?
  }

  get Calculations () {
    throw new Error('Not implemented');
  }

  get PRICING_METHODS () {
    return [
      'reset',
      'remove',
      'reprice'
    ];
  }

  get hasPrice () {
    return !!this.price;
  }

  get totalNow () {
    return decimalize(this.hasPrice ? this.price.now.total : 0);
  }

  get currencyCode () {
    return this.items.currency || '';
  }

  /**
   * Resets items and sets defaults
   *
   * @public
   */
  reset () {
    this.items = {};
    this.currency(this.recurly.config.currency);
  }

  /**
   * Provides a price estimate using current state
   *
   * @param {Function} [done] callback
   * @param {Object} [options]
   * @param {Boolean} [options.internal] when true, the 'change:external' event is not emitted
   * @public
   */
  reprice (done, { internal } = { internal: false }) {
    this.debug('reprice');

    return new PricingPromise((resolve, reject) => {
      new this.Calculations(this, price => {
        if (JSON.stringify(price) === JSON.stringify(this.price)) return resolve(price);
        this.price = price;
        if (!internal) this.emit('change:external', price);
        this.emit('change', price);
        resolve(price);
      });
    }, this).nodeify(done);
  }

  /**
   * Removes an object from the pricing model
   *
   * FIXME: This does not work well with sets i.e. subscriptions
   *
   * example
   *
   *   .remove({ plan: 'plan_code' });
   *   .remove({ addon: 'addon_code' });
   *   .remove({ coupon: 'coupon_code' });
   *   .remove({ address: true }); // to remove without specifying a code
   *
   * @param {Object} opts
   * @param {Function} [done] callback
   * @public
   */
  remove (opts, done) {
    let item;
    this.debug('remove');

    return new PricingPromise((resolve, reject) => {
      let prop = Object.keys(opts)[0];
      let id = opts[prop];
      if (!~Object.keys(this.items).indexOf(prop)) return this.error(errors('invalid-item'), reject);
      if (Array.isArray(this.items[prop])) {
        let pos = this.items[prop].indexOf(findByCode(this.items[prop], { code: id }));
        if (~pos) {
          item = this.items[prop].splice(pos);
        }
      } else if (this.items[prop] && (id === this.items[prop].code || id === true)) {
        item = this.items[prop];
        delete this.items[prop];
      } else {
        return this.error(errors('unremovable-item', {
          type: prop,
          id: id,
          reason: 'does not exist on this pricing instance.'
        }), reject);
      }
    }, this).nodeify(done);
  }

  /**
   * Generates an standard Pricing.item updater method to be given to a PricingPromise
   *
   * @param {String} name item name
   * @param {Object} object item value
   * @return {Function} PricingPromise handler
   * @private
   */
  itemUpdateFactory (name, object) {
    return (resolve, reject) => {
      if (JSON.stringify(object) === JSON.stringify(this.items[name])) {
        return resolve(this.items[name]);
      }

      this.items[name] = object;

      debug(`set.${name}`);
      this.emit(`set.${name}`, object);
      resolve(object);
    };
  }

  /**
   * Emits a namespaced error
   * @param {Error} error
   * @param {Function} reject - Promise rejection function
   * @param {[String]} namespace - dot-delimited error namespace
   * @private
   */
  error (error, reject = () => {}, namespace) {
    if (namespace) {
      namespace.split('.').reduce((memo, name) => this.emit(`${memo}.${name}`, error), 'error');
    }
    this.emit('error', error);
    return reject(error);
  }
}



/**
 * Utility functions
 */

/**
 * Finds an item within a set by its 'code' property. Used for
 * arrayed items like subscription addons
 *
 * @param {Array} set
 * @param {String} code
 * @return {Object}
 * @private
 */
export function findByCode (set, code) {
  return set && find(set, { code });
}
