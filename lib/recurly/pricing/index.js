import Emitter from 'component-emitter';
import PricingPromise from './promise';

const debug = require('debug')('recurly:pricing');

export class Pricing extends Emitter {
  constructor (recurly) {
    super();
    this.recurly = recurly;
    this.debug = debug;
    this.reset();
  }

  get Calculations () {
    throw new Error('Not implemented');
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
   * @public
   */
  reprice (done) {
    this.debug('reprice');

    return new PricingPromise((resolve, reject) => {
      if (!this.items.plan) return this.error(errors('missing-plan'), reject, 'plan');

      new this.Calculations(this, price => {
        if (JSON.stringify(price) === JSON.stringify(this.price)) return resolve(price);
        this.price = price;
        this.emit('change', price);
        resolve(price);
      });
    }, this).nodeify(done);
  }

  /**
   * Removes an object from the pricing model
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
      if (!~PROPERTIES.indexOf(prop)) return this.error(errors('invalid-item'), reject);
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
}

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
