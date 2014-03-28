/**
 * dependencies
 */

var index = require('indexof');
var each = require('each');
var find = require('find');
var type = require('type');
var events = require('event');
var errors = require('../errors');

/**
 * expose
 */

exports.pricing = function (elem) {
  return new Pricing(this, elem);
};

/**
 * 
 */

var PRICEABLE_OBJECTS = ['plan', 'addon', 'coupon', 'tax'];

/**
 * Estimates subscription costs.
 *
 * --- API ---
 * 
 * var pricing = recurly.pricing()
 *   .add({ plan: 'plan_code' })
 *   .add({ addon: 'addon_' })
 *   .add({ coupon: coupon })
 *   .add({ tax: address });
 *
 * pricing.remove({ coupon: coupon });
 * pricing.remove({ addon: addon });
 * pricing.remove('tax');
 * 
 * pricing.price();
 * 
 *   {
 *     now: { subtotal: 57, tax: 2.95 total: 89.95 },
 *     next: { subtotal: 57, tax: 2.95, total: 59.95 },
 *     symbol: '$'
 *   }
 *
 * --- DOM binding ---
 *
 * recurly.pricing(container);
 *
 * TODO:
 *   the calculator can get in a weird state if plan is switched
 *   and the other items are not. Should check item validity when
 *   switching plans. Also should check that the addon and coupon can
 *   be applied to the given plan.
 *
 * @param {Recurly} recurly
 * @param {HTMLElement} [elem] DOM element containing fields to bind to priced objects
 * @public
 */

function Pricing (recurly, elem) {
  this.items = {};
  this.items.addons = [];
  this.recurly = recurly;
  if (elem) this.binding(this.recurly.dom.element(elem));
}

/**
 * Provides a subscription price estimate
 *
 * @param {String} [currency]
 * @param {Function} done
 * @public
 */

Pricing.prototype.price = function price (currency, done) {
  if (!done) {
    done = currency;
    currency = null;
  }

  if ('function' !== type(done)) throw errors('missing-callback');
  if (!this.plan) throw errors('missing-plan');

  currency = currency || this.recurly.config.currency;

  var now = {};
  var next = {};

  var plan = this.items.plan;
  var coupon = this.items.coupon;
  var addons = this.items.addons;
  var tax = this.items.tax; // TODO: tax exemption?
  var trial = plan.trial;
  var planPrice = plan.price[currency];
 
  now.subtotal = next.subtotal = planPrice.unit_amount_in_cents * plan.quantity;

  if (trial) now.subtotal = 0;

  each(addons, function (addon) {
    var price = addon.price[currency].unit_amount_in_cents * addon.quantity;
    if (trial) {
      next.subtotal += price;
    } else {
      now.subtotal += price;
      next.subtotal += price;
    }
  });

  if (coupon) {
    if (coupon.rate) {
      now.subtotal -= now.subtotal * coupon.rate;
      next.subtotal -= next.subtotal * coupon.rate;
    } else {
      now.subtotal -= coupon.discount_in_cents[currency];
      next.subtotal -= coupon.discount_in_cents[currency];
    }
  }

  now.subtotal += planPrice.setup_fee_in_cents;

  now.tax = 0;
  next.tax = 0;

  now.total = now.subtotal;
  next.total = next.subtotal;

  if (tax) this.recurly.tax(tax.address, applyTax);
  else finish();

  function applyTax (err, taxes) {
    if (err) return finish(err);
    each(taxes, function (tax) {
      now.tax += now.subtotal * tax.rate;
      next.tax += next.subtotal * tax.rate;
    });
    now.total += now.tax;
    next.total += next.tax;
    finish();
  }

  function finish (err) {
    each(now, function (name, amount) { now[name] = decimal(amount) });
    each(next, function (name, amount) { next[name] = decimal(amount) });
    done(err, {
      now: now,
      next: next,
      symbol: planPrice.symbol
    });
  }
};

/**
 * adds pricable objects
 *
 * @param {Object} map of plan, addon, coupon, tax
 * @return {this}
 * @public
 */

Pricing.prototype.add = function (items) {
  each(items, function (type, obj) {
    if (!~index(PRICEABLE_OBJECTS, type)) throw errors('invalid-item');
    this[type](obj);
  });
  return this;
};

/**
 * removes an object from the pricing calculator
 *
 * @param {Object} item one of plan, addon, or coupon
 * @return {this}
 * @public
 */

Pricing.prototype.remove = function (item) {
  switch (which(item)) {
    case 'plan': delete this.items.plan; break;
    case 'coupon': delete this.items.coupon; break;
    case 'addon': this.items.addons.splice(index(this.items.addons, item)); break;
    default: throw errors('invalid-item');
  }
  return this;
};

/**
 * adds a plan, []
 *
 * @param {Object} plan
 */

Pricing.prototype.plan = function (plan) {
  plan.quantity = plan.quantity || 1;
  this.items.plan = plan;
};

/**
 * adds an addon, [which must apply to the selected plan]
 *
 * @param {Object} addon
 * @return {this}
 * @public
 */

Pricing.prototype.addon = function (addon) {
  if (typeof addon === 'string') {
    addon = find(this.items.plan.addons, { addon_code: addon });
  }
  this.remove(addon);
  addon.quantity = addon.quantity || 1;
  this.items.addons.push(addon);
};

/**
 * adds a coupon, [which must apply to the selected plan]
 *
 * @param {Object} coupon
 * @return {this}
 * @public
 */

Pricing.prototype.coupon = function (coupon) {
  if (which(coupon) !== 'coupon') throw errors('invalid-coupon');
  this.items.coupon = coupon;
};

/**
 * attaches customer tax information
 *
 * TODO: address checking?
 *
 * @param {Object} address
 * @return {this}
 * @public
 */

Pricing.prototype.tax = function (address) {
  delete this.items.tax;
  this.items.tax = { address: address };
};

function decimal (number) {
  return Math.round(Math.max(number, 0)) / 100;
}
