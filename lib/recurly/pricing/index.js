import currencySymbolFor from 'currency-symbol-map';
import Emitter from 'component-emitter';
import clone from 'component-clone';
import find from 'component-find';
import pick from 'lodash.pick';
import PricingPromise from './promise';
import errors from '../errors';
import decimalize from '../../util/decimalize'

const debug = require('debug')('recurly:pricing');

export class Pricing extends Emitter {
  constructor (recurly) {
    super();
    this.recurly = recurly;
    this.debug = debug;
    this.reset();
    this.reprice();
    this.bindReporting();
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

  get subtotalPreDiscountNow () {
    let subtotalPreDiscountNow = parseFloat(this.price.now.subtotal) + parseFloat(this.price.now.discount);
    return decimalize(this.hasPrice ? subtotalPreDiscountNow : 0)
  }

  get currencyCode () {
    return this.items.currency || '';
  }

  get currencySymbol () {
    return currencySymbolFor(this.currencyCode);
  }

  get couponCodes () {
    if (this.items.coupon) return [this.items.coupon.code];
    return [];
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
  reprice (done, { internal = false } = {}) {
    this.debug('reprice');

    return new PricingPromise((resolve, reject) => {
      new this.Calculations(this, price => {
        if (JSON.stringify(price) === JSON.stringify(this.price)) return resolve(price);
        this.price = price;
        const priceCopy = this.resolveAndEmit('change', price, resolve);
        if (!internal) this.emit('change:external', priceCopy);
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
   *   .remove({ addons: 'addon_code' });
   *   .remove({ coupon: 'coupon_code' });
   *   .remove({ address: true }); // to remove without specifying a code
   *
   * @param {Object} opts
   * @param {Function} [done] callback
   * @public
   */
  remove (opts, done) {
    let item;
    this.debug('remove', opts);

    return new PricingPromise((resolve, reject) => {
      let prop = Object.keys(opts)[0];
      let id = opts[prop];
      if (!~Object.keys(this.items).indexOf(prop)) return this.error(errors('invalid-item'), reject);
      if (Array.isArray(this.items[prop])) {
        let pos = this.items[prop].indexOf(findByCode(this.items[prop], id));
        if (~pos) {
          item = this.items[prop].splice(pos);
        }
      } else if (this.items[prop] && (id === this.items[prop].code || id === true)) {
        item = this.items[prop];
        delete this.items[prop];
      } else {
        return this.error(errors('unremovable-item', {
          type: prop,
          id,
          reason: 'does not exist on this pricing instance.'
        }), reject);
      }
      resolve();
    }, this).nodeify(done);
  }

  /**
   * Utility to emit an event and call a PricingPromise resolver
   * with a mutation-safe copy of the item object
   *
   * @param {string} event event name
   * @param {Object} object pricing item
   * @param {Function} resolve PricingPromise resolver
   * @param {Boolean} [copy] whether to clone the pricing item
   * @return {Object} object or object clone
   * @private
   */
  resolveAndEmit (event, object, resolve, { copy = true } = {}) {
    this.debug(event);
    if (typeof object !== 'object') copy = false;
    if (copy) object = clone(object);
    this.emit(event, object);
    resolve(object);
    return object;
  }

  /**
   * Binds important events to the EventDispatcher
   *
   * @protected
   */
  bindReporting (domain = `pricing`) {
    const report = (...args) => this.recurly.report(...args);
    const setGiftCard = giftCard => report(`${domain}:set:giftCard`, { amount: giftCard.unit_amount });
    const unsetGiftCard = () => report(`${domain}:unset:giftCard`);
    this.on('set.addon', addOn => report(`${domain}:set:addOn`, pick(addOn, ['code', 'quantity'])));
    this.on('set.coupon', coupon => report(`${domain}:set:coupon`, { code: coupon.code }));
    this.on('set.currency', code => report(`${domain}:set:currency`, { code }));
    this.on('set.gift_card', setGiftCard);
    this.on('set.giftCard', setGiftCard);
    this.on('set.plan', plan => report(`${domain}:set:plan`, { code: plan.code }));
    this.on('unset.coupon', () => report(`${domain}:unset:coupon`));
    this.on('unset.gift_card', unsetGiftCard);
    this.on('unset.giftCard', unsetGiftCard);
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
      this.resolveAndEmit(`set.${name}`, object, resolve);
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
