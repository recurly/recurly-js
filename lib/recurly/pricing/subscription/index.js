import type from 'component-type';
import find from 'component-find';
import {Pricing, findByCode} from '../';
import PricingPromise from '../promise';
import Calculations from './calculations';
import Attachment from './attachment';
import errors from '../../../errors';

const debug = require('debug')('recurly:pricing:subscription-pricing');

const PROPERTIES = [
  'plan',
  'addon',
  'coupon',
  'address',
  'currency',
  'gift_card',
  'shipping_address'
];

/**
 * SubscriptionPricing
 *
 * @constructor
 * @param {Recurly} recurly
 * @public
 */

export default class SubscriptionPricing extends Pricing {
  constructor (...args) {
    super(...args);
    this.debug = debug;
    this.PROPERTIES = PROPERTIES;
  }

  get Calculations () {
    return Calculations;
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
   * @public
   */

  plan (planCode, meta, done) {
    const self = this;
    let plan = this.items.plan;
    let quantity;

    if (type(meta) === 'function') {
      done = meta;
      meta = undefined;
    }

    meta = meta || {};

    // meta.quantity, plan.quantity, 1
    if (plan && plan.quantity) quantity = plan.quantity;
    if (meta.quantity) quantity = parseInt(meta.quantity, 10);
    if (!quantity || quantity < 1) quantity = 1;

    return new PricingPromise(function (resolve, reject) {
      if (plan && plan.code === planCode) {
        plan.quantity = quantity;
        return resolve(plan);
      }

      self.recurly.plan(planCode, function (err, plan) {
        if (err) return self.error(err, reject, 'plan');

        plan.quantity = quantity;
        self.items.plan = plan;

        if (!(self.items.currency in plan.price)) {
          self.currency(Object.keys(plan.price)[0]);
        }

        // If we have a coupon, it must be reapplied
        if (self.items.coupon) {
          self.coupon(self.items.coupon.code).then(finish, finish);
        } else {
          finish();
        }

        function finish () {
          debug('set.plan');
          self.emit('set.plan', plan);
          resolve(plan);
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

    if (type(meta) === 'function') {
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

  giftcard ( giftcardCode, done) {
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
   * @param {String} couponCode
   * @param {Function} [done] callback
   * @public
   */

  coupon (couponCode, done) {
    const self = this;
    let coupon = this.items.coupon;

    return new PricingPromise(function (resolve, reject) {
      if (!self.items.plan) return self.error(errors('missing-plan'), reject, 'coupon');
      if (coupon) self.remove({ coupon: coupon.code });

      // A blank coupon is handled as ok
      if (!couponCode) {
        unsetCoupon();
        return resolve();
      }

      self.recurly.coupon({ plan: self.items.plan.code, coupon: couponCode }, function (err, coupon) {
        if (err && err.code === 'not-found') unsetCoupon();

        if (err) {
          return self.error(err, reject, 'coupon');
        } else {
          setCoupon(coupon);
          resolve(coupon);
        }
      });
    }, this).nodeify(done);

    function setCoupon (coupon) {
      debug('set.coupon');
      self.items.coupon = coupon;
      self.emit('set.coupon', coupon);
    }

    function unsetCoupon (err) {
      debug('unset.coupon');
      delete self.items.coupon;
      self.emit('unset.coupon');
    }
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
   * @param {String} tax.tax_code
   * @param {String} tax.vat_number
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
          currencyCode: code,
          planCurrencies: Object.keys(plan.price)
        }), reject, 'currency');
      }

      self.items.currency = code;

      debug('set.currency');
      self.emit('set.currency', code);
      resolve(code);
    }, this).nodeify(done);
  }
}

function addonQuantity (meta, planAddon) {
  let qty = 1;
  if ('quantity' in planAddon) qty = planAddon.quantity;
  if ('quantity' in meta) qty = meta.quantity;
  return parseInt(qty, 10) || 0;
}
