/**
 * dependencies
 */

var Emitter = require('component-emitter');
var index = require('component-indexof');
var type = require('component-type');
var find = require('component-find');
var mixin = require('mixin');
var keys = require('object-component').keys;
var debug = require('debug')('recurly:pricing');
var PricingPromise = require('./promise');
var Calculations = require('./calculations');
var errors = require('../../errors');

import {Recurly} from '../../recurly';

/**
 * Pricing
 *
 * @constructor
 * @param {Recurly} recurly
 * @public
 */

function Pricing (recurly) {
  if (this instanceof Recurly) return new Pricing(this);
  this.recurly = recurly;
  this.reset();
}

Emitter(Pricing.prototype);

/**
 * Subscription properties
 */

Pricing.properties = [
  'plan',
  'addon',
  'coupon',
  'address',
  'currency'
];

/**
 * Resets the pricing calculator
 *
 * @public
 */

Pricing.prototype.reset = function () {
  this.items = {};
  this.items.addons = [];
  this.currency(this.recurly.config.currency);
};

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

Pricing.prototype.remove = function (opts, done) {
  var self = this;
  var item;
  debug('remove');

  return new PricingPromise(function (resolve, reject) {
    var prop = keys(opts)[0];
    var id = opts[prop];
    if (!~index(Pricing.properties, prop)) return self.error(errors('invalid-item'), reject);
    if (prop === 'addon') {
      var pos = index(self.items.addons, findAddon(self.items.addons, { code: id }));
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
};

/**
 * Provides a subscription price estimate using current state
 *
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.reprice = function (done) {
  var self = this;
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
};

/**
 * Updates plan
 *
 * @param {String} planCode
 * @param {Object} [meta]
 * @param {Number} [meta.quantity]
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.plan = function (planCode, meta, done) {
  var self = this;
  var plan = this.items.plan;
  var quantity;

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
        self.currency(keys(plan.price)[0]);
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
};

/**
 * Updates addon
 *
 * @param {String} addonCode
 * @param {Object} [meta]
 * @param {Number} [meta.quantity]
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.addon = function (addonCode, meta, done) {
  var self = this;

  if (type(meta) === 'function') {
    done = meta;
    meta = undefined;
  }

  meta = meta || {};

  return new PricingPromise(function (resolve, reject) {
    if (!self.items.plan) return self.error(errors('missing-plan'), reject, 'addon');

    var planAddon = findAddon(self.items.plan.addons, addonCode);
    if (!planAddon) {
      return self.error(errors('invalid-addon', {
        planCode: self.items.plan.code,
        addonCode: addonCode
      }), reject, 'addon');
    }

    var quantity = addonQuantity(meta, planAddon);
    var addon = findAddon(self.items.addons, addonCode);

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
};

/**
 * Updates coupon
 *
 * @param {String} couponCode
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.coupon = function (couponCode, done) {
  var self = this;
  var coupon = this.items.coupon;

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
};

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

Pricing.prototype.address = function (address, done) {
  return new PricingPromise(updateFactory(this, 'address', address), this).nodeify(done);
};

/**
 * Updates tax info
 *
 * @param {Object} tax
 * @param {String} tax.tax_code
 * @param {String} tax.vat_number
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.tax = function (tax, done) {
  return new PricingPromise(updateFactory(this, 'tax', tax), this).nodeify(done);
};

/**
 * Updates or retrieves currency code
 *
 * @param {String} code
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.currency = function (code, done) {
  var self = this;
  var plan = this.items.plan;
  var currency = this.items.currency;

  return new PricingPromise(function (resolve, reject) {
    if (currency === code) return resolve(currency);
    if (plan && !(code in plan.price)) {
      return self.error(errors('invalid-currency', {
        currencyCode: code,
        planCurrencies: keys(plan.price)
      }), reject, 'currency');
    }

    self.items.currency = code;

    debug('set.currency');
    self.emit('set.currency', code);
    resolve(code);
  }, this).nodeify(done);
};

/**
 * Emits an namespaced errors
 * @param  {Error}    error
 * @param  {Function} reject     Promise rejection function
 * @param  {[String]} namespace  dot-delimited error namespace
 * @private
 */
Pricing.prototype.error = function (error, reject, namespace) {
  if (namespace) {
    namespace.split('.').reduce((memo, name) => this.emit(`${memo}.${name}`, error), 'error');
  }
  this.emit('error', error);
  return reject(error);
};

/**
 * DOM attachment mixin
 */

mixin(Pricing.prototype, require('./attach'));

/**
 * expose
 */

module.exports = exports = Pricing;

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
  var qty = 1;
  if ('quantity' in planAddon) qty = planAddon.quantity;
  if ('quantity' in meta) qty = meta.quantity;
  return parseInt(qty, 10) || 0;
}

function findAddon (addons, code) {
  return addons && find(addons, { code: code });
}
