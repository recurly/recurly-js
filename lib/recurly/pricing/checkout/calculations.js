import currencySymbolFor from 'currency-symbol-map';
import each from 'component-each';
import groupBy from 'lodash.groupby';
import orderBy from 'lodash.orderby';
import Promise from 'promise';
import decimalizeMember from '../../../util/decimalize-member';

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

    // FIXME: use arrays for the price structure of collections (subscriptions, adjustments)
    // FIXME: set this structure functionally
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
      // taxes: []
    };

    // TODO
    // - reorganize item totaling into promises, since coupons may
    //   need to recompute subscriptions, and taxes are already async

    this.subscriptions()
      .then(() => this.adjustments())
      .then(() => this.discounts())
      .then(() => this.subtotals())
      .then(() => this.taxes())
      .then(() => this.totals())
      .then(() => this.giftCards())
      .catch(this.pricing.error)
      .done(() => done(this.price))
  }

  get validSubscriptions () {
    return this.items.subscriptions.filter(sub => sub.isValid);
  }

  get hasValidSubscriptions () {
    return validSubscriptions.length > 0;
  }

  /**
   * Subscriptions
   *
   * - Subscription subtotaling, derived from valid subs only
   * - Adds subscriptions to price item set
   */
  subscriptions (resolve, reject) {
    this.price.now.subscriptions = 0;
    this.price.next.subscriptions = 0;

    this.validSubscriptions.forEach(sub => {
      this.price.now.subscriptions += Number(sub.price.now.total);
      this.price.next.subscriptions += Number(sub.price.next.total);

      this.price.now.items.push(subscriptionItem('now', sub));
      this.price.next.items.push(subscriptionItem('next', sub));
    });

    return Promise.resolve();
  }

  /**
   * Adjustments
   */
  adjustments () {
    this.price.now.adjustments = 0;
    this.price.next.adjustments = 0; // always zero

    this.items.adjustments.forEach(adjustment => {
      const { amount: unitAmount, quantity, code } = adjustment;
      const amount = unitAmount * quantity;
      const item = { type: 'adjustment', code, amount, quantity, unitAmount };

      this.price.now.adjustments += amount;
      this.price.now.items.push(item);
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

    this.price.now.discount = 0;
    this.price.next.discount = 0;

    let promise = Promise.resolve();

    if (!coupon) return promise;

    if (coupon.discount.rate) {
      const {discountableNow, discountableNext} = this.discountableSubtotals(coupon);
      this.price.now.discount = round(discountableNow * coupon.discount.rate);
      this.price.next.discount = round(discountableNext * coupon.discount.rate);
    } else if (coupon.discount.type === 'free_trial' && this.hasValidSubscriptions) {
      if (coupon.redemption_resource === 'subscription') {
        promise.then(() => mostValuableSubscriptionForFreeTrial().coupon(coupon).done());
      } else {
        this.validSubscriptions.forEach(sub => {
          promise.then(() => sub.coupon(coupon).done());
        });
      }
      // recompute subscriptions for the new free trials
      promise.then(this.subscriptions);
    } else if (coupon.discount.amount) {
      this.price.now.discount = coupon.discount.amount[this.items.currency];
      this.price.next.discount = coupon.discount.amount[this.items.currency];
    }

    return promise.then(() => {
      if (coupon.single_use) this.price.next.discount = 0;
    });
  }

  /**
   * Subtotals
   */
  subtotals () {
    const {now, next} = this.price;
    this.price.now.subtotal = now.subscriptions + now.adjustments - now.discount;
    this.price.next.subtotal = next.subscriptions - next.discount;
    return Promise.resolve();
  }

  /**
   * Taxes
   */
  taxes () {
    this.price.now.taxes = 0;
    this.price.next.taxes = 0;
    return Promise.resolve();
  }

  /**
   * Totals
   */
  totals () {
    this.price.now.total = this.price.now.subtotal + this.price.now.taxes;
    this.price.next.total = this.price.next.subtotal + this.price.next.taxes;
    return Promise.resolve();
  }

  /**
   * Gift cards
   */
  giftCards () {
    this.price.now.giftCard = 0;
    this.price.next.giftCard = 0;
    return Promise.resolve();
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
   * @return {[type]} [description]
   */
  discountableSubtotals (coupon) {
    let discountableNow = 0;
    let discountableNext = 0;

    // adjustments
    if (coupon.applies_to_non_plan_charges) {
      discountableNow += this.price.now.adjustments;
    }

    // subscriptions
    if (coupon.applies_to_plans) {
      let discountableSubscriptions;

      // subscription-level coupons may only apply to one subscription
      if (coupon.redemption_resource === 'subscription') {
        discountableSubscriptions = [this.mostValuableSubscriptionForDiscount()];
      } else {
        discountableSubscriptions = this.validSubscriptions.slice(0);
      }

      // reject subscriptions for which this coupon does not apply
      discountableSubscriptions = discountableSubscriptions.filter(sub => {
        if (!sub) return false;
        if (coupon.applies_to_all_plans) return true;
        return !~coupon.plans.indexOf(sub.items.plan.code);
      });

      // add each subscription's discountable amount
      discountableSubscriptions.forEach(sub => {
        discountableNow += discountableSubscriptionSubtotal('now', sub);
        discountableNext += discountableSubscriptionSubtotal('next', sub);
      });
    }

    return {discountableNow, discountableNext};
  }

  /**
   * Finds the subscription with the greatest subtotal
   *
   * @param  {Array[SubscriptionPricing]} [subscriptions=this.validSubscriptions]
   * @return {SubscriptionPricing}
   */
  mostValuableSubscriptionForDiscount (subscriptions = this.validSubscriptions) {
    return orderBy(subscriptions, sub => sub.price.now.subtotal, 'desc')[0];
  }

  /**
   * Finds the subscription with the shortest trial length and greatest subtotal
   *
   * @return {subscriptionPricing}
   */
  mostValuableSubscriptionForFreeTrial () {
    const trialSet = groupBy(this.validSubscriptions, trialLength);
    const shortestTrial = Object.keys(trialSet).sort()[0];
    return this.mostValuableSubscription(trialSet[shortestTrial]);
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
 * @return {Number} discountable subtotal
 */
function discountableSubscriptionSubtotal (when, subscription) {
  const price = subscription.price[when];
  return parseFloat(price.subtotal) + parseFloat(price.discount) - parseFloat(price.setup_fee);
}
