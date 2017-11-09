import currencySymbolFor from 'currency-symbol-map';
import each from 'component-each';
import groupBy from 'lodash.groupby';
import isEmpty from 'lodash.isempty';
import orderBy from 'lodash.orderby';
import Promise from 'promise';
import uniq from 'lodash.uniq';
import uniqBy from 'lodash.uniqby';
import decimalizeMember from '../../../util/decimalize-member';
import taxCeil from '../../../util/tax-ceil';

// Price structure
//
// {
//   now: {
//     items: [
//       {
//         type: 'subscription',
//         code: 'abcxyz',
//       x description: 'Plan name',
//         amount: '0.00',
//         setupFee: '0.00',
//         addons: '0.00',
//         plan: '0.00'
//       },
//       {
//         type: 'adjustment',
//         code: '123789',
//       x description: 'Arbitrary',
//         amount: '0.00',
//         unitAmount: '0.00',
//         quantity: '1'
//       }
//     ],
//     subscriptions: '0.00',
//     adjustments: '0.00',
//     discount: '0.00',
//     tax: '0.00',
//     subtotal: '0.00',
//     giftCard: '0.00',
//     total: '0.00'
//   },
//   next: { /* see above, exclude adjustments */ },
//
// x base: {
// x   subscriptions: [
// x     {
// x       id,
// x       description: subscriptionPricing.items.plan.name,
// x       {subscriptionPricing.price.base} // replace addon hash with array
// x     }
// x   ],
// x   adjustments: [
// x     { description, amount }
// x   ]
// x ],
//
//   currency: { code, symbol },
//   taxes: [
//     {
//       type: 'us',
//       rate: '0.0875',
//       region: 'CA'
//     }
//   ]
// };

/**
 * Checkout pricing calculation handler
 *
 * @param {CheckoutPricing} pricing
 * @constructor
 * @public
 */
export default class Calculations {
  constructor (pricing, done) {
    this.pricing = pricing;
    this.items = pricing.items;
    this._itemizedSets = { now: {}, next: {} };

    this.getTaxes = Promise.denodeify(this.pricing.recurly.tax.bind(this.pricing.recurly));

    this.price = {
      now: { items: [] },
      next: { items: [] },
      // base: {
      //   subscriptions: [],
      //   adjustments: []
      // },
      currency: {
        code: this.items.currency,
        symbol: currencySymbolFor(this.items.currency)
      },
      taxes: []
    };

    // TODO: Instead of relying on ordering assumptions, it would be ideal to define each
    //       calculation's dependencies
    this.subscriptions()
      .then(() => this.adjustments())
      .then(() => this.discounts())
      .then(() => this.subtotals())
      .then(() => this.taxes())
      .then(() => this.giftCards())
      .then(() => this.totals())
      .then(() => this.itemizedSets())
      .catch(err => this.pricing.error(err))
      .done(() => {
        each(this.price.now, decimalizeMember, this.price.now);
        each(this.price.next, decimalizeMember, this.price.next);
        this.price.now.items.forEach(item => each(item, decimalizeMember, item));
        this.price.next.items.forEach(item => each(item, decimalizeMember, item));
        done(this.price);
      });
  }

  get validAdjustments () {
    return this.pricing.validAdjustments;
  }

  get validSubscriptions () {
    return this.pricing.validSubscriptions;
  }

  get hasValidSubscriptions () {
    return this.validSubscriptions.length > 0;
  }

  get taxableAdjustments () {
    return this.validAdjustments.filter(adj => !adj.taxExempt);
  }

  get taxableSubscriptions () {
    return this.validSubscriptions.filter(sub => !sub.items.plan.tax_exempt);
  }

  // includes undefined entries
  get taxCodes () {
    const taxableItems = this.taxableAdjustments.concat(this.taxableSubscriptions);
    return uniq(taxableItems.map(item => item.taxCode));
  }

  /**
   * Subscriptions
   *
   * - Subscription subtotaling, derived from valid subs only
   * - Adds subscriptions to price item set
   *
   * @return {Promise}
   */
  subscriptions () {
    this.price.now.subscriptions = 0;
    this.price.next.subscriptions = 0;
    this._itemizedSets.now.subscriptions = [];
    this._itemizedSets.next.subscriptions = [];

    this.validSubscriptions.forEach(sub => {
      this.price.now.subscriptions += Number(sub.price.now.total);
      this.price.next.subscriptions += Number(sub.price.next.total);

      this._itemizedSets.now.subscriptions.push(subscriptionItem('now', sub));
      this._itemizedSets.next.subscriptions.push(subscriptionItem('next', sub));
    });

    return Promise.resolve();
  }

  /**
   * Adjustments
   *
   * @return {Promise}
   */
  adjustments () {
    this.price.now.adjustments = 0;
    this.price.next.adjustments = 0; // always zero
    this._itemizedSets.now.adjustments = [];

    this.validAdjustments.forEach(adjustment => {
      const { amount: unitAmount, quantity, code } = adjustment;
      const amount = unitAmount * quantity;
      const item = { type: 'adjustment', code, amount, quantity, unitAmount };

      this.price.now.adjustments += amount;
      this._itemizedSets.now.adjustments.push(item);
    });

    return Promise.resolve();
  }

  /**
   * Discounts
   *
   * @return {Promise}
   */
  discounts () {
    const coupon = this.items.coupon;
    const round = amt => parseFloat((Math.round(amt * 100) / 100).toFixed(6));
    let promise = Promise.resolve();

    this.price.now.discount = 0;
    this.price.next.discount = 0;

    // Remove all previously-applied coupons
    this.items.subscriptions.forEach(sub => {
      promise = promise.then(() => sub.coupon().reprice(null, { internal: true }))
    });

    if (!coupon) return promise;

    if (coupon.discount.rate) {
      const { discountableNow, discountableNext } = this.discountableSubtotals(coupon, { setupFees: false });
      this.price.now.discount = round(discountableNow * coupon.discount.rate);
      this.price.next.discount = round(discountableNext * coupon.discount.rate);
    } else if (coupon.discount.type === 'free_trial') {
      promise = promise.then(() => this.applyFreeTrialCoupon());
    } else {
      const { discountableNow, discountableNext } = this.discountableSubtotals(coupon);
      this.price.now.discount = Math.min(discountableNow, coupon.discount.amount[this.items.currency]);
      this.price.next.discount = Math.min(discountableNext, coupon.discount.amount[this.items.currency]);
    }

    return promise.then(() => {
      if (coupon.single_use) this.price.next.discount = 0;
    });
  }

  /**
   * Subtotals
   *
   * @return {Promise}
   */
  subtotals () {
    const { now, next } = this.price;
    this.price.now.subtotal = now.subscriptions + now.adjustments - now.discount;
    this.price.next.subtotal = next.subscriptions - next.discount;
    return Promise.resolve();
  }

  /**
   * Taxes
   *
   * Workflow
   * - collects tax rates for each tax code and the
   *   base tax info (country, postal code, vat number)
   * - applies taxes to each taxable item, according to its tax code
   *
   * @return {Promise}
   */
  taxes () {
    let taxNow = this.price.now.taxes = 0;
    let taxNext = this.price.next.taxes = 0;

    const baseTaxInfo = Object.assign({}, this.items.address, this.items.tax);

    // Taxation requires that we at least have base tax information
    if (isEmpty(baseTaxInfo)) return Promise.resolve();

    const getTaxesFor = item => this.getTaxes(Object.assign({}, baseTaxInfo, { taxCode: item.taxCode }));
    const fixedAmount = amt => parseFloat(amt.toFixed(6));
    let taxRates = [];

    return Promise.all(this.taxableAdjustments.map(adj => {
      return getTaxesFor(adj).then(taxes => {
        taxRates = taxRates.concat(taxes);
        taxNow += taxes.reduce((sum, tax) => sum + fixedAmount(adj.amount * adj.quantity * tax.rate), 0);
      });
    }))
    .then(Promise.all(this.taxableSubscriptions.map(sub => {
      return getTaxesFor(sub).then(taxes => {
        taxRates = taxRates.concat(taxes);
        taxes.forEach(tax => {
          taxNow += fixedAmount(sub.price.now.subtotal * tax.rate);
          taxNext += fixedAmount(sub.price.next.subtotal * tax.rate);
        });
      });
    })))
    .catch(err => this.pricing.emit('error', err))
    .then(() => {
      this.price.taxes = uniqBy(taxRates, JSON.stringify);
      this.price.now.taxes = taxCeil(taxNow);
      this.price.next.taxes = taxCeil(taxNext);
    });
  }

  /**
   * Gift cards
   *
   * @return {Promise}
   */
  giftCards () {
    this.price.now.giftCard = 0;
    this.price.next.giftCard = 0;

    if (!this.items.giftCard) return;

    const eligibleNow = this.price.now.subtotal + this.price.now.taxes;
    const eligibleNext = this.price.next.subtotal + this.price.next.taxes;
    const { used: cardUsedNow, remains: cardRemaining } = useGiftcard(eligibleNow, this.items.giftCard.unit_amount);
    const { used: cardUsedNext } = useGiftcard(eligibleNext, cardRemaining);

    this.price.now.giftCard = cardUsedNow;
    this.price.next.giftCard = cardUsedNext;

    function useGiftcard (price, giftCardValue) {
      let used = 0;
      let remains = 0;

      if (giftCardValue > price) {
        used = price;
        remains = giftCardValue - price;
      } else {
        used = giftCardValue;
      }

      return { used, remains };
    }

    return Promise.resolve();
  }

  /**
   * Totals
   *
   * @return {Promise}
   */
  totals () {
    this.price.now.total = this.price.now.subtotal + this.price.now.taxes - this.price.now.giftCard;
    this.price.next.total = this.price.next.subtotal + this.price.next.taxes - this.price.next.giftCard;
    return Promise.resolve();
  }

  /**
   * Creates itemized entires for price.now and price.next
   *
   * @return {Promise}
   */
  itemizedSets () {
    this.price.now.items = this._itemizedSets.now.subscriptions.concat(this._itemizedSets.now.adjustments);
    this.price.next.items = this._itemizedSets.next.subscriptions;
    return Promise.resolve();
  }

  /**
   * Applies a free trial coupon
   *
   * @return {Promise}
   */
  applyFreeTrialCoupon () {
    const coupon = this.items.coupon;

    if (!this.hasValidSubscriptions) return Promise.resolve();

    if (coupon.redemption_resource === 'subscription') {
      return this.mostValuableSubscriptionForFreeTrial()
        .coupon(coupon)
        .reprice(null, { internal: true })
        .then(() => this.subscriptions());
    }

    return Promise.all(this.validSubscriptions.map(s => s.coupon(coupon).reprice(null, { internal: true })))
      .then(() => this.subscriptions());
  }

  /**
   * Computes the discountable subtotals for a given coupon
   *
   * Workflow
   *  - Whether coupon applies to adjustments
   *  - Whether coupon applies to subscriptions
   *    - Whether coupon is plan-specific or plan-agnostic
   *    - Whether coupon applies at subcription or account level
   *    - Whether coupon applies to each subscription
   *
   * @param  {Object} coupon
   * @param  {Object} [options]
   * @param  {Boolean} [options.setupFees=true] whether to include setup fees
   * @return {Object} { discountableNow, discountableNext }
   */
  discountableSubtotals (coupon, { setupFees } = { setupFees: true }) {
    let discountableNow = 0;
    let discountableNext = 0;

    // adjustments
    if (coupon.applies_to_non_plan_charges) {
      discountableNow += this.price.now.adjustments;
    }

    // subscriptions
    if (coupon.applies_to_plans && this.hasValidSubscriptions) {
      let discountableSubscriptions;

      // subscription-level coupons may only apply to one subscription
      if (coupon.redemption_resource === 'subscription') {
        discountableSubscriptions = [this.mostValuableSubscriptionForDiscount()];
      } else {
        discountableSubscriptions = this.validSubscriptions;
      }

      discountableSubscriptions = filterSubscriptionsForCoupon(discountableSubscriptions, coupon);

      // add each subscription's discountable amount
      discountableSubscriptions.forEach(sub => {
        discountableNow += discountableSubscriptionSubtotal('now', sub, { setupFees });
        discountableNext += discountableSubscriptionSubtotal('next', sub, { setupFees });
      });
    }

    return { discountableNow, discountableNext };
  }

  /**
   * Finds the subscription with the greatest subtotal
   *
   * @param  {Array[SubscriptionPricing]} [subscriptions=this.validSubscriptions]
   * @return {SubscriptionPricing}
   */
  mostValuableSubscriptionForDiscount (subscriptions = this.validSubscriptions) {
    subscriptions = filterSubscriptionsForCoupon(subscriptions, this.items.coupon);
    return orderBy(subscriptions, sub => sub.price.now.subtotal, 'desc')[0];
  }

  /**
   * Finds the subscription with the shortest trial length and greatest subtotal
   *
   * @return {subscriptionPricing}
   */
  mostValuableSubscriptionForFreeTrial () {
    const subscriptions = filterSubscriptionsForCoupon(this.validSubscriptions, this.items.coupon);
    const trialSet = groupBy(subscriptions, trialLength);
    const shortestTrial = Object.keys(trialSet).sort()[0];
    return this.mostValuableSubscriptionForDiscount(trialSet[shortestTrial]);
  }
}

/**
 * Utilities
 */

/**
 * Builds a price.items[{type: 'subscription'}] item
 *
 * @param  {String} when 'now' or 'next'
 * @param  {SubscriptionPricing} subscription
 * @return {Object} item
 */
function subscriptionItem (when, subscription) {
  const { id, price } = subscription;
  return {
    type: 'subscription',
    id,
    amount: price[when].total,
    setupFee: price[when].setup_fee,
    addons: price[when].addons,
    plan: price[when].plan
  };
}

/**
 * Returns a subscription's trial length in seconds
 *
 * @param  {Object} subscription
 * @return {Number} trial length in seconds
 */
function trialLength (subscription) {
  if (!subscription.items.plan.trial) return 0;
  const seconds = {
    day: 86400,
    week: 604800, // 7 days
    month: 2678400 // 31 days
  }[subscription.items.plan.trial.interval] || 0;
  return subscription.items.plan.trial.length * seconds;
}

/**
 * Returns a subscription's discountable subtotal
 *
 * - plan + addons + discount + setup_fee = subtotal
 * - discountable_subtotal = subtotal + discount - setup_fee
 *
 * @param  {String} when 'now' or 'next'
 * @param  {SubscriptionPricing} subscription
 * @param  {Object} [options]
 * @param  {Boolean} [options.setupFees=true] whether to include setup fees
 * @return {Number} discountable subtotal
 */
function discountableSubscriptionSubtotal (when, subscription, { setupFees } = { setupFees: true }) {
  const price = subscription.price[when];
  let subtotal = parseFloat(price.subtotal) + parseFloat(price.discount);
  if (!setupFees) subtotal -= parseFloat(price.setup_fee);
  return subtotal;
}

/**
 * Filter subscriptions for which this coupon does not apply
 * @param  {Array[EmbeddedSubscriptionPricing]} subscriptions
 * @param  {Object} coupon
 * @return {Array[EmbeddedSubscriptionPricing]}
 */
function filterSubscriptionsForCoupon (subscriptions, coupon) {
  if (subscriptions.length === 0) return subscriptions;
  if (coupon.applies_to_all_plans) return subscriptions;
  return subscriptions.filter(sub => sub.couponIsValidForSubscription(coupon));
}
