/**
 * dependencies
 */

var Emitter = require('emitter');
var Promise = require('promise');
var index = require('indexof');
var each = require('each');
var type = require('type');
var bind = require('bind');
var find = require('find');
var mixin = require('mixin');
var keys = require('object.keys-shim');
var json = require('json');
var debug = require('debug')('recurly:pricing');
var Calculations = require('./calculations');
var errors = require('../../errors');

/**
 * expose
 */

exports.Pricing = Pricing;

/**
 * subscription properties
 */

var PROPERTIES = [
    'plan'
  , 'addon'
  , 'coupon'
  , 'address'
  , 'currency'
];

/**
 * Pricing
 *
 * TODO
 *  - then/promise over callbacks?
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
 * Resets the pricing calculator
 *
 * @public
 */

Pricing.prototype.reset = function () {
  this.items = {};
  this.items.addons = [];
  this.set({ currency: this.recurly.config.currency });
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
 * @param {Functon} done
 * @public
 */

Pricing.prototype.remove = function (opts, done) {
  debug('remove');
  var item;

  for (var prop in opts) {
    var id = opts[prop];
    if (!~index(PROPERTIES, prop)) return this.emit('error', errors('invalid-item'));
    if (prop === 'addon') {
      var pos = index(this.items.addons, findAddon(this.items.addons, id));
      if (~pos) {
        item = this.items.addons.splice(pos);
      }
    } else if (this.items[prop] && (id === this.items[prop].code || id === true)) {
      item = this.items[prop]
      delete this.items[prop];
    } else {
      var err = errors('unremovable-item', {
          type: prop
        , id: id
        , reason: 'does not currently exist on pricing calculation.'
      });
      this.emit('error', err);
      if (done) return done(err);
    }
    break;
  }

  if (done) return done(null, item);
};

/**
 * Provides a subscription price estimate using current state
 *
 * @param {Function} done
 * @private
 */

Pricing.prototype.reprice = function (done) {
  if (!this.items.plan) return;
  var self = this;

  Calculations(this, function (price) {
    if (json.stringify(price) === json.stringify(self.price)) return done(null, price);
    self.price = price;
    self.emit('change', price);
    done(null, price);
  });
};

/**
 * Updates plan
 *
 * @param {String} plan_code
 * @param {Object} meta
 * @param {Function} done
 * @private
 */

Pricing.prototype.plan = function (plan_code, meta, done) {
  if (this.items.plan && this.items.plan.code === plan_code) {
    return done(null, this.items.plan);
  }

  var self = this;
  this.recurly.plan(plan_code, function (err, plan) {
    if (err) {
      self.emit('error', err);
      return done(err);
    }

    self.items.plan = plan;

    if (!(self.items.currency in plan.price)) {
      self.currency(keys(plan.price)[0]);
    }

    debug('set.plan`');
    self.emit('set.plan', plan);
    done(null, plan);
  });
};

/**
 * Updates addon
 *
 * @param {String} addon_code
 * @param {Object} meta
 * @param {Number} meta.quantity
 * @param {Function} done
 * @private
 */

Pricing.prototype.addon = function (addon_code, meta, done) {
  if (!this.items.plan) {
    var err = errors('missing-plan');
    this.emit('error', err);
    return done(err);
  }

  var planAddon = findAddon(this.items.plan.addons, addon_code);
  if (!planAddon) {
    var err = errors('invalid-addon', {
        planCode: this.items.plan.code
      , addonCode: addon_code
    });
    this.emit('error', err);
    return done(err);
  }

  var quantity = addonQuantity(meta, planAddon);
  var addon = findAddon(this.items.addons, addon_code);

  if (isNaN(quantity) || quantity === 0) {
    return this.remove({ addon: addon_code }, done);
  }

  if (addon) {
    addon.quantity = quantity;
  } else {
    var addon = json.parse(json.stringify(planAddon));
    addon.quantity = quantity;
    this.items.addons.push(addon);
  }

  debug('set.addon');
  this.emit('set.addon', addon);
  done(null, addon);
};

/**
 * Updates coupon
 *
 * @param {String} coupon_code
 * @param {Object} meta
 * @param {Function} done
 * @private
 */

Pricing.prototype.coupon = function (coupon_code, meta, done) {
  if (!this.items.plan) {
    var err = errors('missing-plan');
    this.emit('error', err);
    return done(err);
  }

  if (this.items.coupon && this.items.coupon.code === coupon_code) {
    return done(null, this.items.coupon);
  }

  if (this.items.coupon) {
    this.remove({ coupon: this.items.coupon.code });
  }

  if (!coupon_code) return done();

  var self = this;
  this.recurly.coupon({ plan: this.items.plan.code, coupon: coupon_code }, function (err, coupon) {
    if (err) {
      self.emit('error', err);
      return done(err);
    }

    self.items.coupon = coupon;

    debug('set.coupon');
    self.emit('set.coupon', coupon);
    done(null, coupon);
  });
};

/**
 * Updates address
 *
 * @param {Object} address
 * @param {String} address.country
 * @param {String|Number} address.postal_code
 * @param {Object} meta
 * @param {Function} done
 * @private
 */

Pricing.prototype.address = function (address, meta, done) {
  if (json.stringify(address) === json.stringify(this.items.address)) {
    return done(null, this.items.address);
  }

  this.items.address = address;

  debug('set.address');
  this.emit('set.address', address);
  done(null, address);
};

/**
 * Updates or retrieves currency code
 *
 * @param {String} [code]
 * @param {Object} meta
 * @param {Function} done
 * @private
 */

Pricing.prototype.currency = function (code, meta, done) {
  if (this.items.currency === code) {
    return done(null, this.items.currency);
  }

  if (this.items.plan && !(code in this.items.plan.price)) {
    var err = errors('invalid-currency', {
        currencyCode: code
      , planCurrencies: keys(this.items.plan.price)
    });
    this.emit('error', err);
    return done(err);
  }

  this.items.currency = code;

  debug('set.currency');
  this.emit('set.currency', code);
  done(null, code);
};

/**
 * PricingPromise
 *
 * issues repricing when .done
 */

function PricingPromise (fn) {
  if (!(this instanceof PricingPromise)) return new PricingPromise(fn);
  Promise.call(this, fn);
}

PricingPromise.prototype = Promise.prototype;
PricingPromise.prototype.constructor = PricingPromise;

PricingPromise.prototype.done = function (onFulfilled, onRejected) {
  if (this.pricing) this.pricing.reprice();
  return Promise.prototype.done.apply(this, arguments);
};

/**
 * DOM binding mixin
 */

mixin(Pricing.prototype, require('./binding'));

/**
 * Utility functions
 */

function addonQuantity (meta, planAddon) {
  var qty = meta.quantity !== undefined
    ? meta.quantity
    : planAddon.quantity !== undefined
      ? planAddon.quantity
      : 1;

  return parseInt(qty, 10);
}

function findAddon (addons, code) {
  return addons && find(addons, { code: code });
}
 
