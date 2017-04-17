/**
 * dependencies
 */

var each = require('component-each');
var find = require('component-find');
var merge = require('lodash.merge');

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
    base: {
      plan: {},
      addons: {}
    },
    addons: {}, // DEPRECATED
    currency: {
      code: this.items.currency,
      symbol: this.planPrice().symbol
    }
  };

  this.subtotal();

  this.tax(function () {
    this.total();
    this.giftcard();
    each(this.price.base.plan, decimal, this.price.base.plan);
    each(this.price.base.addons, decimal, this.price.base.addons);
    each(this.price.addons, decimal, this.price.addons); // DEPRECATED
    each(this.price.now, decimal, this.price.now);
    each(this.price.next, decimal, this.price.next);
    done(this.price);
  });
}

/**
 * Calculates subtotal
 *
 * @private
 */

Calculations.prototype.subtotal = function () {
  this.price.now.subtotal = 0;
  this.price.next.subtotal = 0;

  this.plan();
  this.price.now.subtotal += this.price.now.plan;
  this.price.next.subtotal += this.price.next.plan;

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
 * tax info precedence: `tax` > `shipping_address` > `address`
 *
 * @param {Function} done
 * @private
 */

Calculations.prototype.tax = function (done) {
  this.price.now.tax = 0;
  this.price.next.tax = 0;

  const address = this.items.shipping_address || this.items.address;
  const taxInfo = merge({}, address);

  merge(taxInfo, this.items.tax);

  if (taxInfo) {
    var self = this;
    this.pricing.recurly.tax(taxInfo, function applyTax (err, taxes) {
      if (err) {
        self.pricing.emit('error', err);
      } else {
        self.price.taxes = [];
        each(taxes, function (tax) {
          if (self.items.plan.tax_exempt) return;
          self.price.now.tax += parseFloat((self.price.now.subtotal * tax.rate).toFixed(6));
          self.price.next.tax += parseFloat((self.price.next.subtotal * tax.rate).toFixed(6));
          // If we have taxes, we may want to display the rate...
          // push the taxes so we know what they are...
          self.price.taxes.push(tax);
        });

        // tax estimation prefers partial cents to always round up
        self.price.now.tax = taxCeil(self.price.now.tax);
        self.price.next.tax = taxCeil(self.price.next.tax);
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
 * Subtracts any giftcard value from the total
 *
 * @private
 */

Calculations.prototype.giftcard = function () {
  if(this.pricing.items.gift_card){
    let nowTotal = this.price.now.total;
    let nextTotal = this.price.next.total;
    let giftcardNow = useGiftcard(nowTotal,this.pricing.items.gift_card.unit_amount);
    let giftcardNext = useGiftcard(nextTotal,giftcardNow.remains);

    this.price.now.gift_card = giftcardNow.used;
    this.price.next.gift_card = giftcardNext.used;

    this.price.now.total = nowTotal - giftcardNow.used;
    this.price.next.total = nextTotal - giftcardNext.used;
  }

  function useGiftcard(price,giftcardValue){
    let used = 0;
    let remains = 0;
    if(giftcardValue > price){
      used = price;
      remains = giftcardValue - price;
    } else {
      used = giftcardValue;
    }
    return { used, remains };
  }
};

/**
 * Computes plan prices
 *
 * @private
 */

Calculations.prototype.plan = function () {
  var base = this.items.plan.price[this.items.currency];
  this.price.base.plan.unit = base.unit_amount;
  this.price.base.plan.setup_fee = base.setup_fee;

  var amount = this.planPrice().amount;
  this.price.now.plan = amount;
  this.price.next.plan = amount;
  if (this.isTrial()) this.price.now.plan = 0;
};

/**
 * Computes addon prices and applies addons to the subtotal
 *
 * @private
 */

Calculations.prototype.addons = function () {
  this.price.now.addons = 0;
  this.price.next.addons = 0;
  // exclude usage addons.
  if (!Array.isArray(this.items.plan.addons)) {
    return;
  }

  let fixedAddons = this.items.plan.addons.filter(function(addon){
    return addon.add_on_type === "fixed";
  });

  fixedAddons.forEach((addon) => {
    let price = addon.price[this.items.currency].unit_amount;

    this.price.base.addons[addon.code] = price;
    this.price.addons[addon.code] = price; // DEPRECATED

    const selected = find(this.items.addons, { code: addon.code });
    if (selected) {
      price = price * selected.quantity;
      if (!this.isTrial()) this.price.now.addons += price;
      this.price.next.addons += price;
    }
  });
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

      if(this.items.plan.trial && coupon.single_use){
        var discountNext = parseFloat((this.price.next.subtotal * coupon.discount.rate).toFixed(6));
      } else {
        var discountNext = coupon.single_use ? 0 : parseFloat((this.price.next.subtotal * coupon.discount.rate).toFixed(6));
      }

      this.price.now.discount = Math.round(discountNow * 100) / 100;
      this.price.next.discount = Math.round(discountNext * 100) / 100;
    } else if (coupon.discount.type === 'free_trial') {
      // Handled in separate trial logic
    } else {

      this.price.now.discount = coupon.discount.amount[this.items.currency];
      if(this.items.plan.trial && coupon.single_use){
        this.price.next.discount = coupon.discount.amount[this.items.currency];
      } else {
        this.price.next.discount = coupon.single_use ? 0 : coupon.discount.amount[this.items.currency];
      }
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

Calculations.prototype.isTrial = function () {
  const coupon = this.items.coupon;
  if (coupon && coupon.discount.type === 'free_trial') return true;
  return this.items.plan.trial;
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

/**
 * Ceilings the second decimal of a number without risk of
 * floating point math errors
 *
 * @param {Number} number
 * @return {Number}
 * @private
 */

function taxCeil (number) {
  return +(Math.ceil(number + 'e+2') + 'e-2');
}
