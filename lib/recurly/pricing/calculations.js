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
 * @private
 */

Calculations.prototype.subtotal = function () {
  var subtotal = this.planPrice().amount;

  this.price.now.subtotal = subtotal;
  this.price.next.subtotal = subtotal;

  if (this.items.plan.trial) this.price.now.subtotal = 0;

  this.addons();
  this.price.now.subtotal += this.price.now.addons;
  this.price.next.subtotal += this.price.next.addons;

  this.discount();
  this.price.now.subtotal -= this.price.now.discount;
  this.price.next.subtotal -= this.price.next.discount;

  this.setupFee();
  this.price.now.subtotal += this.price.now.setup_fee;
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
      if (err) {
        self.pricing.emit('error', err);
      } else {
        each(taxes, function (tax) {
          if (tax.type === 'usst' && self.items.plan.tax_exempt) return;
          self.price.now.tax += parseFloat((self.price.now.subtotal * tax.rate).toFixed(6));
          self.price.next.tax += parseFloat((self.price.next.subtotal * tax.rate).toFixed(6));
        });

        // tax estimation prefers partial cents to always round up
        self.price.now.tax = Math.ceil(self.price.now.tax * 100) / 100;
        self.price.next.tax = Math.ceil(self.price.next.tax * 100) / 100;
      }
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
  this.price.now.addons = 0;
  this.price.next.addons = 0;

  each(this.items.plan.addons, function (addon) {
    var price = addon.price[this.items.currency].unit_amount;

    this.price.addons[addon.code] = price;

    var selected = find(this.items.addons, { code: addon.code });
    if (selected) {
      price = price * selected.quantity;
      if (!this.items.plan.trial) this.price.now.addons += price;
      this.price.next.addons += price;
    }
  }, this);
};

/**
 * Applies coupon discount to the subtotal
 *
 * @private
 */

Calculations.prototype.discount = function () {
  var coupon = this.items.coupon;

  this.price.now.discount = 0;
  this.price.next.discount = 0;

  if (coupon) {
    if (coupon.discount.rate) {
      var discountNow = parseFloat((this.price.now.subtotal * coupon.discount.rate).toFixed(6));
      var discountNext = parseFloat((this.price.next.subtotal * coupon.discount.rate).toFixed(6));
      this.price.now.discount = Math.round(discountNow * 100) / 100;
      this.price.next.discount = Math.round(discountNext * 100) / 100;
    } else {
      this.price.now.discount = coupon.discount.amount[this.items.currency];
      this.price.next.discount = coupon.discount.amount[this.items.currency];
    }
  }
};

/**
 * Applies plan setup fee to the subtotal
 *
 * @private
 */

Calculations.prototype.setupFee = function () {
  this.price.now.setup_fee = this.planPrice().setup_fee;
  this.price.next.setup_fee = 0;
};

/**
 * Get the price structure of a plan based on currency
 *
 * @return {Object}
 * @private
 */

Calculations.prototype.planPrice = function () {
  var plan = this.items.plan;
  var price = plan.price[this.items.currency];
  price.amount = price.unit_amount * (plan.quantity || 1);
  return price;
};

/**
 * Applies a decimal transform on an object's member
 *
 * @param {String} prop Property on {this} to transform
 * @this {Object} on which to apply decimal transformation
 * @private
 */

function decimal (prop) {
  this[prop] = (Math.round(Math.max(this[prop], 0) * 100) / 100).toFixed(2);
}
