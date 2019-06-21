import clone from 'component-clone';
import uid from '../../../util/uid';
import { Pricing, findByCode } from '../';
import PricingPromise from '../promise';
import Calculations from './calculations';
import Attachment from './attachment';
import errors from '../../errors';

const debug = require('debug')('recurly:pricing:subscription-pricing');

/**
 * SubscriptionPricing
 *
 * @constructor
 * @param {Recurly} recurly
 * @public
 */
export default class SubscriptionPricing extends Pricing {
  constructor (recurly, { id = uid()} = {}) {
    super(recurly);
    this.id = id;
    this.debug = debug;
    this.recurly.report('pricing:subscription:create');
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
        return resolve(clone(currentPlan));
      }

      this.recurly.plan(planCode, (err, plan) => {
        if (err) return this.error(err, reject, 'plan');

        plan.quantity = quantity;
        this.items.plan = plan;

        if (!(this.items.currency in plan.price)) {
          this.currency(Object.keys(plan.price)[0]);
        }

        const finish = () => this.resolveAndEmit('set.plan', plan, resolve);

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
    if (typeof meta === 'function') {
      done = meta;
      meta = undefined;
    }

    meta = meta || {};

    return new PricingPromise((resolve, reject) => {
      if (!this.items.plan) return this.error(errors('missing-plan'), reject, 'addon');

      let planAddon = findByCode(this.items.plan.addons, addonCode);
      if (!planAddon) {
        return this.error(errors('invalid-addon', {
          planCode: this.items.plan.code,
          addonCode: addonCode
        }), reject, 'addon');
      }

      let quantity = addonQuantity(meta, planAddon);
      let addon = findByCode(this.items.addons, addonCode);

      if (quantity === 0) {
        this.remove({ addons: addonCode });
      }

      if (addon) {
        addon.quantity = quantity;
      } else {
        addon = JSON.parse(JSON.stringify(planAddon));
        addon.quantity = quantity;
        this.items.addons.push(addon);
      }

      this.resolveAndEmit('set.addon', addon, resolve);
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
            self.items.gift_card = gift_card;
            self.resolveAndEmit('set.gift_card', gift_card, resolve);
          }
        }
      });

    }, this).nodeify(done);

    function unsetGiftcard (err) {
      debug('unset.gift_card');
      delete self.items.gift_card;
      self.emit('unset.gift_card');
    }
  }

  /**
   * Updates coupon
   *
   * `set.coupon` is emitted when a valid coupon is set
   * `unset.coupon` is emitted when an existing valid coupon is removed
   * `error.coupon` is emitted when the requested coupon is invalid
   *
   * @param {String} newCoupon coupon code
   * @param {Object} newCoupon coupon object
   * @param {Function} [done] callback
   * @public
   */
  coupon (newCoupon, done) {
    // If the new coupon matches the current one, we just need to ensure it
    // still applies to the current plan
    if (~this.couponCodes.indexOf(newCoupon)) {
      return new PricingPromise((resolve, reject) => {
        if (!this.couponIsValidForSubscription(this.items.coupon)) {
          this.removeCurrentCoupon();
          return this.error('invalid-coupon-for-subscription', reject, 'coupon');
        }
        resolve(clone(this.items.coupon));
      }, this);
    }

    return new PricingPromise((resolve, reject) => {
      if (!this.items.plan) return this.error(errors('missing-plan'), reject, 'coupon');

      if (this.items.coupon) this.removeCurrentCoupon();

      // A blank coupon is handled as ok
      if (!newCoupon) return resolve();

      const receiveCoupon = (err, coupon) => {
        if (err) {
          return this.error(err, reject, 'coupon');
        }
        if (!this.couponIsValidForSubscription(coupon)) {
          return this.error('invalid-coupon-for-subscription', reject, 'coupon');
        } else {
          this.items.coupon = coupon;
          this.resolveAndEmit('set.coupon', coupon, resolve);
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
   * @param {Object} [tax.amounts] specific tax amounts. Overrides automated tax rate calculations
   * @param {Object} [tax.amounts.now] specific tax to apply on the immediate charge
   * @param {Object} [tax.amounts.next] specific tax to apply on the next billing cycle
   * @param {String} tax.tax_code // deprecated
   * @param {String} tax.vat_number // deprecated
   * @param {Function} [done] callback
   * @public
   */
  tax (tax, done) {
    this.guardTaxSignature(tax);
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
    return new PricingPromise((resolve, reject) => {
      let plan = this.items.plan;
      if (this.items.currency === code) return resolve(this.items.currency);
      if (plan && !(code in plan.price)) {
        return this.error(errors('invalid-currency', {
          currency: code,
          allowed: Object.keys(plan.price)
        }), reject, 'currency');
      }

      this.items.currency = code;
      this.resolveAndEmit('set.currency', code, resolve);
    }, this).nodeify(done);
  }

  /**
   * Checks whether a given coupon may apply to this subscription
   * @param  {Object} coupon
   * @return {Boolean}
   * @private
   */
  couponIsValidForSubscription (coupon) {
    if (!coupon) return false;
    if (!coupon.applies_to_plans) return false;
    if (coupon.applies_to_all_plans) return true;
    if (~coupon.plans.indexOf(this.items.plan.code)) return true;
    return false;
  }

  /**
   * Removes the current coupon
   *
   * emits `unset.coupon`
   *
   * @private
   */
  removeCurrentCoupon () {
    if (!this.items.coupon) return;
    const currentCoupon = clone(this.items.coupon);
    debug('unset.coupon');
    this.remove({ coupon: currentCoupon.code }).then(() => this.emit('unset.coupon', currentCoupon));
  }

  /**
   * Parses plan method options
   *
   * @param  {String}   planCode
   * @param  {Object}   [options]
   * @param  {Function} done
   * @return {object}
   * @private
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

  /**
   * Binds important events to the EventDispatcher
   *
   * @protected
   */
  bindReporting () {
    super.bindReporting('pricing:subscription');
    const report = (...args) => this.recurly.report(...args);
    this.on('attached', () => report('pricing:subscription:attached'));
    this.on('change:external', price => report('pricing:subscription:change', {
      price: {
        addons: price.now.addons,
        couponCodes: this.couponCodes,
        currency: this.currencyCode,
        discount: price.now.discount,
        giftCard: price.now.gift_card,
        taxes: price.now.taxes,
        total: price.now.total,
        totalNext: price.next.total,
      }
    }));
  }
}

function addonQuantity (meta, planAddon) {
  let qty = 1;
  if ('quantity' in planAddon) qty = planAddon.quantity;
  if ('quantity' in meta) qty = meta.quantity;
  return parseInt(qty, 10) || 0;
}
