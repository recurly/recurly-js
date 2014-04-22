/**
 * dependencies
 */

var each = require('each');
var bind = require('bind');
var find = require('find');

/**
 * expose
 */

module.exports = Calculations;

/**
 * Subscription calculation calculation
 *
 * @param {Pricing} pricing
 * @constructor
 * @public
 */

function Calculations (pricing, done) {
  if (!(this instanceof Calculations)) {
    return new Calculations(pricing, done);
  }

  this.pricing = pricing;
  this.items = pricing.items;

  this.price = {
    now: {},
    next: {},
    addons: {},
    currency: {
      code: this.items.currency,
      symbol: this.planPrice().symbol
    }
  };

  this.subtotal();
  this.tax(function () {
    this.total();
    each(this.price.now, decimal, this.price.now);
    each(this.price.next, decimal, this.price.next);
    each(this.price.addons, decimal, this.price.addons);
    done(this.price);
  });
}

/**
 * Calculates subtotal
 *
 * TODO:
 *  - remove subtotal calcs from addons, coupon, and setupFee
 *  - calc subtotal from each value above on this.price
 *
 * @private
 */

Calculations.prototype.subtotal = function () {
  var subtotal = this.planPrice().unit_amount_in_cents;

  this.price.now.subtotal = subtotal;
  this.price.next.subtotal = subtotal;

  if (this.items.plan.trial) this.price.now.subtotal = 0;

  this.addons();
  this.coupon();
  this.setupFee();
};

/**
 * Calculates tax
 * 
 * @param {Function} done
 * @private
 */

Calculations.prototype.tax = function (done) {
  this.price.now.tax = 0;
  this.price.next.tax = 0;

  if (this.items.address) {
    var self = this;
    this.pricing.recurly.tax(this.items.address, function applyTax (err, taxes) {
      if (err) self.pricing.emit('error', err);
      else each(taxes, function (tax) {
        if (tax.type === 'usst' && self.items.plan.tax_exempt) return;
        self.price.now.tax += self.price.now.subtotal * tax.rate;
        self.price.next.tax += self.price.next.subtotal * tax.rate;
      });
      done.call(self);
    });
  } else done.call(this);
};

/**
 * Calculates total
 *
 * @private
 */

Calculations.prototype.total = function () {
  this.price.now.total = this.price.now.subtotal + this.price.now.tax;
  this.price.next.total = this.price.next.subtotal + this.price.next.tax;
};

/**
 * Computes addon prices and applies addons to the subtotal
 *
 * @private
 */

Calculations.prototype.addons = function () {
  each(this.items.plan.addons, function (addon) {
    var price = addon.price[this.items.currency].unit_amount_in_cents;

    this.price.addons[addon.code] = price;

    var selected = find(this.items.addons, { code: addon.code });
    if (selected) {
      price = price * selected.quantity;
      if (this.items.plan.trial) {
        this.price.next.subtotal += price;
      } else {
        this.price.now.subtotal += price;
        this.price.next.subtotal += price;
      }
    }
  }, this);
};

/**
 * Applies coupon to the subtotal
 *
 * @private
 */

Calculations.prototype.coupon = function () {
  var coupon = this.items.coupon;

  this.price.now.discount = 0;
  this.price.next.discount = 0;

  if (coupon) {
    if (coupon.discount.rate) {
      this.price.now.discount = this.price.now.subtotal * coupon.discount.rate;
      this.price.next.discount = this.price.next.subtotal * coupon.discount.rate;
    } else {
      this.price.now.discount = coupon.discount.amount_in_cents[this.items.currency];
      this.price.next.discount = coupon.discount.amount_in_cents[this.items.currency];
    }
  }

  this.price.now.subtotal -= this.price.now.discount;
  this.price.next.subtotal -= this.price.next.discount;
};

/**
 * Applies plan setup fee to the subtotal
 *
 * @private
 */

Calculations.prototype.setupFee = function () {
  this.price.now.subtotal += this.planPrice().setup_fee_in_cents;
};

/**
 * Get the price structure of a plan based on currency
 *
 * @return {Object}
 * @private
 */

Calculations.prototype.planPrice = function () {
  return this.items.plan.price[this.items.currency];
};

/**
 * Applies a cent -> decimal transform on an object's member
 *
 * @param {String} prop Property on {this} to transform
 * @this {Object} on which to apply decimal transformation
 * @private
 */

function decimal (prop) {
  this[prop] = (Math.round(Math.max(this[prop], 0)) / 100).toFixed(2);
}
