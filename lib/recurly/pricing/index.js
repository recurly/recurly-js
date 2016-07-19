import Emitter from 'component-emitter';
import type from 'component-type';
import find from 'component-find';
import PricingPromise from './promise';
import Calculations from './calculations';
import Attachment from './attachment';
import errors from '../../errors';

const debug = require('debug')('recurly:pricing');

const PROPERTIES = [
  'plan',
  'addon',
  'coupon',
  'address',
  'currency'
];

/**
 * Pricing
 *
 * @constructor
 * @param {Recurly} recurly
 * @public
 */

export default class Pricing extends Emitter {
  constructor (recurly) {
    super();
    this.recurly = recurly;
    this.reset();
  }

  /**
   * Attachment factory
   *
   * @param {HTMLElement} container element on which to attach
   */

  attach (container) {
    if (this.attachment) this.attachment.detach();
    this.attachment = new Attachment(this, container);
    return this.attachment;
  }

  /**
   * Resets the pricing calculator
   *
   * @public
   */

  reset () {
    this.items = {};
    this.items.addons = [];
    this.currency(this.recurly.config.currency);
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
    const self = this;
    let item;
    debug('remove');

    return new PricingPromise(function (resolve, reject) {
      let prop = Object.keys(opts)[0];
      let id = opts[prop];
      if (!~PROPERTIES.indexOf(prop)) return self.error(errors('invalid-item'), reject);
      if (prop === 'addon') {
        let pos = self.items.addons.indexOf(findAddon(self.items.addons, { code: id }));
        if (~pos) {
          item = self.items.addons.splice(pos);
        }
      } else if (self.items[prop] && (id === self.items[prop].code || id === true)) {
        item = self.items[prop];
        delete self.items[prop];
      } else {
        return self.error(errors('unremovable-item', {
          type: prop,
          id: id,
          reason: 'does not exist on this pricing instance.'
        }), reject);
      }
    }, this).nodeify(done);
  }

  /**
   * Provides a subscription price estimate using current state
   *
   * @param {Function} [done] callback
   * @public
   */

  reprice (done) {
    const self = this;
    debug('reprice');

    return new PricingPromise(function (resolve, reject) {
      if (!self.items.plan) return self.error(errors('missing-plan'), reject, 'plan');

      Calculations(self, function (price) {
        if (JSON.stringify(price) === JSON.stringify(self.price)) return resolve(price);
        self.price = price;
        self.emit('change', price);
        resolve(price);
      });
    }, this).nodeify(done);
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

      let planAddon = findAddon(self.items.plan.addons, addonCode);
      if (!planAddon) {
        return self.error(errors('invalid-addon', {
          planCode: self.items.plan.code,
          addonCode: addonCode
        }), reject, 'addon');
      }

      let quantity = addonQuantity(meta, planAddon);
      let addon = findAddon(self.items.addons, addonCode);

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
    return new PricingPromise(updateFactory(this, 'address', address), this).nodeify(done);
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
    return new PricingPromise(updateFactory(this, 'tax', tax), this).nodeify(done);
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

  /**
   * Emits an namespaced errors
   * @param  {Error}    error
   * @param  {Function} reject     Promise rejection function
   * @param  {[String]} namespace  dot-delimited error namespace
   * @private
   */
  error (error, reject, namespace) {
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

function updateFactory (self, name, object) {
  return (resolve, reject) => {
    if (JSON.stringify(object) === JSON.stringify(self.items[name])) {
      return resolve(self.items[name]);
    }

    self.items[name] = object;

    debug(`set.${name}`);
    self.emit(`set.${name}`, object);
    resolve(object);
  };
}

function addonQuantity (meta, planAddon) {
  let qty = 1;
  if ('quantity' in planAddon) qty = planAddon.quantity;
  if ('quantity' in meta) qty = meta.quantity;
  return parseInt(qty, 10) || 0;
}

function findAddon (addons, code) {
  return addons && find(addons, { code: code });
}
