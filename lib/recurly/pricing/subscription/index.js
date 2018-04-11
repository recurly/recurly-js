import uuid from 'uuid/v4';
import {Pricing, findByCode} from '../';
import PricingPromise from '../promise';
import Calculations from './calculations';
import Attachment from './attachment';
import errors from '../../../errors';

const debug = require('debug')('recurly:pricing:subscription-pricing');

/**
 * SubscriptionPricing
 *
 * @constructor
 * @param {Recurly} recurly
 * @public
 */
export default class SubscriptionPricing extends Pricing {
  constructor (recurly, { id = uuid()} = {}) {
    super(recurly);
    this.id = id;
    this.debug = debug;
  }

  get Calculations () {
    return Calculations;
  }

  get PRICING_METHODS () {
    return super.PRICING_METHODS.concat([
      'addon',
      'address',
      'coupon',
      'currency',
      'giftcard',
      'plan',
      'shippingAddress',
      'tax'
    ]);
  }

  get isValid () {
    return !!(this.items.plan && this.price);
  }

  get taxCode () {
    if (!this.items.tax) return;
    return this.items.tax.taxCode || this.items.tax.tax_code;
  }

  get taxExempt () {
    return this.items.plan && this.items.plan.tax_exempt;
  }

  reset () {
    super.reset();
    this.items.addons = [];
  }

  /**
   * Attachment factory
   *
   * @param {HTMLElement} container - element on which to attach
   */
  attach (container) {
    if (this.attachment) this.attachment.detach();
    this.attachment = new Attachment(this, container);
    this.attachment.once('ready', () => this.emit('attached'));
    return this.attachment;
  }

  /**
   * Updates plan
   *
   * @param {String} planCode
   * @param {Object} [meta]
   * @param {Number} [meta.quantity]
   * @param {Function} [done] callback
   * @return {PricingPromise}
   * @public
   */
  plan (...args) {
    let { currentPlan, quantity, planCode, options, done } = this.resolvePlanOptions(...args);

    return new PricingPromise((resolve, reject) => {
      if (currentPlan && currentPlan.code === planCode) {
        currentPlan.quantity = quantity;
        return resolve(currentPlan);
      }

      this.recurly.plan(planCode, (err, plan) => {
        if (err) return this.error(err, reject, 'plan');

        const finish = () => {
          debug('set.plan');
          this.emit('set.plan', plan);
          resolve(plan);
        };

        plan.quantity = quantity;
        this.items.plan = plan;

        if (!(this.items.currency in plan.price)) {
          this.currency(Object.keys(plan.price)[0]);
        }

        // If we have a coupon, it must be reapplied
        if (this.items.coupon) {
          this.coupon(this.items.coupon.code).then(finish, finish);
        } else {
          finish();
        }
      });
    }, this).nodeify(done);
  }

  /**
   * Updates addon
   *
   * @param {String} addonCode
   * @param {Object} [meta]
   * @param {Number} [meta.quantity]
   * @param {Function} [done] callback
   * @public
   */
  addon (addonCode, meta, done) {
    const self = this;

    if (typeof meta === 'function') {
      done = meta;
      meta = undefined;
    }

    meta = meta || {};

    return new PricingPromise(function (resolve, reject) {
      if (!self.items.plan) return self.error(errors('missing-plan'), reject, 'addon');

      let planAddon = findByCode(self.items.plan.addons, addonCode);
      if (!planAddon) {
        return self.error(errors('invalid-addon', {
          planCode: self.items.plan.code,
          addonCode: addonCode
        }), reject, 'addon');
      }

      let quantity = addonQuantity(meta, planAddon);
      let addon = findByCode(self.items.addons, addonCode);

      if (quantity === 0) {
        self.remove({ addon: addonCode });
      }

      if (addon) {
        addon.quantity = quantity;
      } else {
        addon = JSON.parse(JSON.stringify(planAddon));
        addon.quantity = quantity;
        self.items.addons.push(addon);
      }

      debug('set.addon');
      self.emit('set.addon', addon);
      resolve(addon);
    }, this).nodeify(done);
  }

 /**
  * Updates Giftcard
  *
  * @param {String} giftcardCode
  * @param {Function} [done] callback
  * @public
  */
  giftcard (giftcardCode, done) {
    var self = this;

    return new PricingPromise(function (resolve, reject) {
      unsetGiftcard();

      if (!giftcardCode) return resolve()

      self.recurly.giftcard({ giftcard: giftcardCode }, function(err,gift_card){
        if (err && err.code === 'not-found') unsetGiftcard();

        if (err) {
          return self.error(err, reject, 'gift_card');
        } else {
          if(self.items.currency !== gift_card.currency){
            unsetGiftcard();
            return self.error(errors('gift-card-currency-mismatch'), reject, 'gift_card');
          } else {
            setGiftcard(gift_card);
            resolve(gift_card);
          }
        }
      });

    }, this).nodeify(done);

    function setGiftcard (gift_card) {
      debug('set.gift_card');
      self.items.gift_card = gift_card;
      self.emit('set.gift_card', gift_card);
    }

    function unsetGiftcard (err) {
      debug('unset.gift_card');
      delete self.items.gift_card;
      self.emit('unset.gift_card');
    }
  }

  /**
   * Updates coupon
   *
   * @param {String} newCoupon coupon code
   * @param {Object} newCoupon coupon object
   * @param {Function} [done] callback
   * @public
   */
  coupon (newCoupon, done) {
    const unsetCoupon = () => {
      debug('unset.coupon');
      delete this.items.coupon;
      this.emit('unset.coupon');
    };

    return new PricingPromise((resolve, reject) => {
      if (!this.items.plan) return this.error(errors('missing-plan'), reject, 'coupon');
      if (this.items.coupon) this.remove({ coupon: this.items.coupon.code });

      // A blank coupon is handled as ok
      if (!newCoupon) {
        unsetCoupon();
        return resolve();
      }

      const receiveCoupon = (err, coupon) => {
        if (err && err.code === 'not-found') unsetCoupon();
        if (err) {
          return this.error(err, reject, 'coupon');
        }
        if (!this.couponIsValidForSubscription(coupon)) {
          return this.error('invalid-coupon-for-subscription', reject, 'coupon');
        } else {
          debug('set.coupon');
          this.items.coupon = coupon;
          this.emit('set.coupon', coupon);
          resolve(coupon);
        }
      };

      if (typeof newCoupon === 'string') {
        this.recurly.coupon({ plan: this.items.plan.code, coupon: newCoupon }, receiveCoupon);
      } else {
        receiveCoupon(null, newCoupon);
      }
    }, this).nodeify(done);
  }

  /**
   * Updates address
   *
   * @param {Object} address
   * @param {String} address.country
   * @param {String|Number} address.postal_code
   * @param {String} address.vat_number
   * @param {Function} [done] callback
   * @public
   */
  address (address, done) {
    return new PricingPromise(this.itemUpdateFactory('address', address), this).nodeify(done);
  }

  /**
   * Updates shipping address
   *
   * @param {Object} address
   * @param {String} address.country
   * @param {String|Number} address.postal_code
   * @param {String} address.vat_number
   * @param {Function} [done] callback
   * @public
   */
  shippingAddress (address, done) {
    return new PricingPromise(this.itemUpdateFactory('shipping_address', address), this).nodeify(done);
  }

  /**
   * Updates tax info
   *
   * @param {Object} tax
   * @param {String} tax.taxCode
   * @param {String} tax.vatNmber
   * @param {String} tax.tax_code // deprecated
   * @param {String} tax.vat_number // deprecated
   * @param {Function} [done] callback
   * @public
   */
  tax (tax, done) {
    return new PricingPromise(this.itemUpdateFactory('tax', tax), this).nodeify(done);
  }

  /**
   * Updates or retrieves currency code
   *
   * @param {String} code
   * @param {Function} [done] callback
   * @public
   */
  currency (code, done) {
    const self = this;
    let plan = this.items.plan;
    let currency = this.items.currency;

    return new PricingPromise(function (resolve, reject) {
      if (currency === code) return resolve(currency);
      if (plan && !(code in plan.price)) {
        return self.error(errors('invalid-currency', {
          currency: code,
          allowed: Object.keys(plan.price)
        }), reject, 'currency');
      }

      self.items.currency = code;

      debug('set.currency');
      self.emit('set.currency', code);
      resolve(code);
    }, this).nodeify(done);
  }

  /**
   * Checks whether a given coupon may apply to this subscription
   * @param  {Object} coupon
   * @return {Boolean}
   */
  couponIsValidForSubscription (coupon) {
    if (!coupon) return false;
    if (!coupon.applies_to_plans) return false;
    if (coupon.applies_to_all_plans) return true;
    if (~coupon.plans.indexOf(this.items.plan.code)) return true;
    return false;
  }

  /**
   * Parses plan method options
   *
   * @param  {String}   planCode
   * @param  {Object}   [options]
   * @param  {Function} done
   * @return {object}
   */
  resolvePlanOptions (planCode, options = {}, done) {
    let plan = this.items.plan;
    let quantity;

    if (typeof options === 'function') {
      done = options;
      options = {};
    }

    // options.quantity, plan.quantity, 1
    if (plan && plan.quantity) quantity = plan.quantity;
    if (options.quantity) quantity = parseInt(options.quantity, 10);
    if (!quantity || quantity < 1) quantity = 1;

    return { currentPlan: plan, quantity, planCode, options, done };
  }
}

function addonQuantity (meta, planAddon) {
  let qty = 1;
  if ('quantity' in planAddon) qty = planAddon.quantity;
  if ('quantity' in meta) qty = meta.quantity;
  return parseInt(qty, 10) || 0;
}
