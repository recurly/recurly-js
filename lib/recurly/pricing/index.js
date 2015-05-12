/**
 * dependencies
 */

var Emitter = require('emitter');
var index = require('indexof');
var type = require('type');
var find = require('find');
var mixin = require('mixin');
var keys = require('object').keys;
var json = require('json');
var debug = require('debug')('recurly:pricing');
var PricingPromise = require('./promise');
var Calculations = require('./calculations');
var errors = require('../../errors');

/**
 * expose
 */

module.exports = Pricing;

/**
 * Pricing
 *
 * @constructor
 * @param {Recurly} recurly
 * @public
 */

function Pricing (recurly) {
  if (this instanceof require('../../recurly')) return new Pricing(this);
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
    if (!~index(Pricing.properties, prop)) return reject(errors('invalid-item'));
    if (prop === 'addon') {
      var pos = index(self.items.addons, findAddon(self.items.addons, { code: id }));
      if (~pos) {
        item = self.items.addons.splice(pos);
      }
    } else if (self.items[prop] && (id === self.items[prop].code || id === true)) {
      item = self.items[prop];
      delete self.items[prop];
    } else {
      return reject(errors('unremovable-item', {
        type: prop,
        id: id,
        reason: 'does not exist on this pricing instance.'
      }));
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
    if (!self.items.plan) return reject(errors('missing-plan'));

    Calculations(self, function (price) {
      if (json.stringify(price) === json.stringify(self.price)) return resolve(price);
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
      if (err) return reject(err);

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
    if (!self.items.plan) return reject(errors('missing-plan'));

    var planAddon = findAddon(self.items.plan.addons, addonCode);
    if (!planAddon) {
      return reject(errors('invalid-addon', {
        planCode: self.items.plan.code,
        addonCode: addonCode
      }));
    }

    var quantity = addonQuantity(meta, planAddon);
    var addon = findAddon(self.items.addons, addonCode);

    if (quantity === 0) {
      self.remove({ addon: addonCode });
    }

    if (addon) {
      addon.quantity = quantity;
    } else {
      addon = json.parse(json.stringify(planAddon));
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
    if (!self.items.plan) return reject(errors('missing-plan'));
    if (coupon) self.remove({ coupon: coupon.code });

    // TODO: Should this emit an 'unset' event?
    // Need to consider other objects as well
    if (!couponCode) {
      debug('unset.coupon');
      delete self.items.coupon;
      return resolve();
    }

    self.recurly.coupon({ plan: self.items.plan.code, coupon: couponCode }, function (err, coupon) {
      if (err && err.code !== 'not-found') return reject(err);

      self.items.coupon = coupon;

      debug('set.coupon');
      self.emit('set.coupon', coupon);
      resolve(coupon);
    });
  }, this).nodeify(done);
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
  var self = this;

  return new PricingPromise(function (resolve, reject) {
    if (json.stringify(address) === json.stringify(self.items.address)) {
      return resolve(self.items.address);
    }

    self.items.address = address;

    debug('set.address');
    self.emit('set.address', address);
    resolve(address);
  }, this).nodeify(done);
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
  var self = this;

  return new PricingPromise(function (resolve, reject) {
    if (json.stringify(tax) === json.stringify(self.items.tax)) {
      return resolve(self.items.tax);
    }

    self.items.tax = tax;

    debug('set.tax');
    self.emit('set.tax', tax);
    resolve(tax);
  }, this).nodeify(done);
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
      return reject(errors('invalid-currency', {
        currencyCode: code,
        planCurrencies: keys(plan.price)
      }));
    }

    self.items.currency = code;

    debug('set.currency');
    self.emit('set.currency', code);
    resolve(code);
  }, this).nodeify(done);
};

/**
 * DOM attachment mixin
 */

mixin(Pricing.prototype, require('./attach'));

/**
 * Utility functions
 */

function addonQuantity (meta, planAddon) {
  var qty = 1;
  if ('quantity' in planAddon) qty = planAddon.quantity;
  if ('quantity' in meta) qty = meta.quantity;
  return parseInt(qty, 10) || 0;
}

function findAddon (addons, code) {
  return addons && find(addons, { code: code });
}
