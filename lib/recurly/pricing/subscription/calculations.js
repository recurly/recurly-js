import each from 'component-each';
import find from 'component-find';
import isEmpty from 'lodash.isempty';
import decimalizeMember from '../../../util/decimalize-member';
import taxRound from '../../../util/tax-round';
import { getTieredPricingTotal, getTieredPricingUnitAmount, isTieredAddOn } from './tiered-pricing-calculator';

/**
 * Subscription pricing calculation handler
 *
 * @param {SubscriptionPricing} pricing
 * @constructor
 * @public
 */

export default class Calculations {
  constructor (pricing, done) {
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
        code: this.pricing.currencyCode,
        symbol: this.pricing.currencySymbol
      },
      taxes: []
    };

    this.subtotal();

    this.tax(function () {
      this.total();
      this.giftCard();
      each(this.price.base.plan, decimalizeMember, this.price.base.plan);
      each(this.price.base.addons, decimalizeMember, this.price.base.addons);
      each(this.price.addons, decimalizeMember, this.price.addons); // DEPRECATED
      each(this.price.now, decimalizeMember, this.price.now);
      each(this.price.next, decimalizeMember, this.price.next);
      done(this.price);
    });
  }

  get isTrial () {
    const coupon = this.items.coupon;
    if (coupon && coupon.discount.type === 'free_trial') return true;
    return !!this.items.plan.trial;
  }

  get planPrice () {
    const plan = this.items.plan;
    if (!plan) return { amount: 0, setup_fee: 0 };
    let price = plan.price[this.items.currency];
    let quantity = this.planQuantity;
    if (isNaN(quantity)) quantity = 1;
    price.amount = price.unit_amount * quantity;
    return price;
  }

  get planQuantity () {
    return parseInt(this.items.plan?.quantity, 10);
  }

  /**
   * Calculates subtotal
   *
   * @private
   */
  subtotal () {
    this.price.now.subtotal = 0;
    this.price.next.subtotal = 0;

    this.plan();
    this.price.now.subtotal += this.price.now.plan;
    this.price.next.subtotal += this.price.next.plan;

    this.addons();
    this.price.now.subtotal += this.price.now.addons;
    this.price.next.subtotal += this.price.next.addons;

    this.setupFee();
    this.discount();
    this.price.now.subtotal -= this.price.now.discount;
    this.price.next.subtotal -= this.price.next.discount;
    this.price.now.subtotal += this.price.now.setup_fee;
  }

  /**
   * Calculates total
   *
   * @private
   */
  total () {
    this.price.now.total = this.price.now.subtotal + this.price.now.tax;
    this.price.next.total = this.price.next.subtotal + this.price.next.tax;
  }

  /**
   * Calculates tax
   *
   * tax info precedence: `tax` > `shippingAddress` > `address`
   *
   * @param {Function} done
   * @private
   */
  tax (done) {
    this.price.now.tax = 0;
    this.price.next.tax = 0;

    // If tax amount has been specified, simply apply it
    if (this.items.tax && this.items.tax.amount) {
      this.price.now.tax = taxRound(this.items.tax.amount.now);
      this.price.next.tax = taxRound(this.items.tax.amount.next);
      return done.call(this);
    }

    // Tax the shipping address if present, or
    const taxAddress = this.items.shippingAddress || this.items.address;
    const taxInfo = Object.assign({}, taxAddress, this.items.tax);

    if (!isEmpty(taxInfo)) {
      this.pricing.recurly.tax(taxInfo, (err, taxes) => {
        if (err) {
          this.pricing.emit('error', err);
        } else {
          this.price.taxes = [];
          each(taxes, tax => {
            if (this.pricing.taxExempt) return;
            this.price.now.tax += parseFloat((this.price.now.subtotal * tax.rate).toFixed(6));
            this.price.next.tax += parseFloat((this.price.next.subtotal * tax.rate).toFixed(6));
            // If we have taxes, we may want to display the rate...
            // push the taxes so we know what they are...
            this.price.taxes.push(tax);
          });

          // tax estimation prefers partial cents to round to the nearest cent
          this.price.now.tax = taxRound(this.price.now.tax);
          this.price.next.tax = taxRound(this.price.next.tax);
        }
        done.call(this);
      });
    } else {
      done.call(this);
    }
  }

  /**
   * Computes plan prices
   *
   * @private
   */
  plan () {
    this.price.now.plan = 0;
    this.price.next.plan = 0;

    if (!this.items.plan) return;

    const base = this.items.plan.price[this.items.currency];
    this.price.base.plan.unit = base.unit_amount;
    this.price.base.plan.setup_fee = base.setup_fee;

    const amount = this.planPrice.amount;
    this.price.now.plan = amount;
    this.price.next.plan = amount;

    if (this.isTrial) this.price.now.plan = 0;
  }

  /**
   * Computes addon prices and applies addons to the subtotal
   *
   * @private
   */
  addons () {
    this.price.now.addons = 0;
    this.price.next.addons = 0;

    if (!this.items.plan) return;
    if (!Array.isArray(this.items.plan.addons)) return;

    this.items.plan.addons.forEach(addon => {
      // exclude usage addons
      if (addon.add_on_type !== 'fixed') return;

      const selectedQuantity = find(this.items.addons, { code: addon.code })?.quantity || 0;

      let unitPrice; // Price per unit, displayed on the label
      let totalPrice; // Total price for the addon

      if (this.planQuantity < 1) {
        unitPrice = 0;
        totalPrice = 0;
      } else if (isTieredAddOn(addon)) {
        const currencyCode = this.pricing.currencyCode;
        totalPrice = getTieredPricingTotal(addon, selectedQuantity, currencyCode);
        unitPrice = getTieredPricingUnitAmount(addon, selectedQuantity, currencyCode);
      } else {
        unitPrice = addon.price[this.items.currency].unit_amount;
        totalPrice = unitPrice * selectedQuantity;
      }

      this.price.base.addons[addon.code] = unitPrice;
      this.price.addons[addon.code] = totalPrice; // DEPRECATED

      if (!this.isTrial) this.price.now.addons += totalPrice;
      this.price.next.addons += totalPrice;
    });
  }

  /**
   * Applies coupon discount to the subtotal
   *
   * @private
   */
  discount () {
    var coupon = this.items.coupon;

    this.price.now.discount = 0;
    this.price.next.discount = 0;

    if (!coupon) return;

    if (coupon.discount.rate) {
      var discountNow = parseFloat((this.price.now.subtotal * coupon.discount.rate).toFixed(6));
      var discountNext = parseFloat((this.price.next.subtotal * coupon.discount.rate).toFixed(6));
      this.price.now.discount = Math.round(discountNow * 100) / 100;
      this.price.next.discount = Math.round(discountNext * 100) / 100;
    } else if (coupon.discount.type === 'free_trial') {
      // Handled in separate trial logic
    } else {
      const discountableNow = this.price.now.subtotal + this.price.now.setup_fee;
      const discountableNext = this.price.next.subtotal;
      this.price.now.discount = Math.min(discountableNow, coupon.discount.amount[this.items.currency]);
      this.price.next.discount = Math.min(discountableNext, coupon.discount.amount[this.items.currency]);
    }

    if (coupon.single_use && this.price.now.discount > 0) this.price.next.discount = 0;
  }

  /**
   * Applies plan setup fee to the subtotal
   *
   * @private
   */
  setupFee () {
    this.price.now.setup_fee = this.planQuantity > 0 ? this.planPrice.setup_fee : 0;
    this.price.next.setup_fee = 0;
  }

  /**
   * Subtracts any giftcard value from the total
   *
   * @private
   */
  giftCard () {
    if (this.pricing.items.gift_card) {
      let nowTotal = this.price.now.total;
      let nextTotal = this.price.next.total;
      let giftcardNow = useGiftcard(nowTotal,this.pricing.items.gift_card.unit_amount);
      let giftcardNext = useGiftcard(nextTotal,giftcardNow.remains);

      this.price.now.gift_card = giftcardNow.used;
      this.price.next.gift_card = giftcardNext.used;

      this.price.now.total = nowTotal - giftcardNow.used;
      this.price.next.total = nextTotal - giftcardNext.used;
    }

    function useGiftcard (price,giftcardValue){
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
  }
}
