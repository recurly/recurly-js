import each from 'component-each';
import groupBy from 'lodash.groupby';
import orderBy from 'lodash.orderby';
import currencySymbolFor from 'currency-symbol-map';
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

    this.subtotal();

    this.tax(() => {
      this.total();
      this.giftCard();

      // FIXME: decimalizeMember will not work for this price pattern

      // each(this.price.base.subscriptions, decimalizeMember, this.price.base.subscriptions);
      // each(this.price.base.adjustments, decimalizeMember, this.price.base.adjustments);

      // each(this.price.now, decimalizeMember, this.price.now);
      // each(this.price.next, decimalizeMember, this.price.next);
      done(this.price);
    });
  }

  /**
   * TODO
   */
  subtotal () {
    this.price.now.subtotal = 0;
    this.price.next.subtotal = 0;

    this.subscriptions();
    this.price.now.subtotal += this.price.now.subscriptions;
    this.price.next.subtotal += this.price.next.subscriptions;

    this.adjustments();
    this.price.now.subtotal += this.price.now.adjustments;

    this.discount();
    this.price.now.subtotal -= this.price.now.discount;
    this.price.next.subtotal -= this.price.next.discount;
  }

  /**
   * TODO
   */
  total () {
    this.price.now.total = this.price.now.subtotal + this.price.now.tax;
    this.price.next.total = this.price.next.subtotal + this.price.next.tax;
  }

  /**
   * TODO
   */
  tax (done) {
    this.price.now.tax = 0;
    this.price.next.tax = 0;
    done();
  }

  /**
   * TODO - document
   */
  subscriptions () {
    this.price.now.subscriptions = 0;
    this.price.next.subscriptions = 0;

    this.items.subscriptions.forEach(subscription => {
      this.price.now.subscriptions += Number(subscription.price.now.total);
      this.price.next.subscriptions += Number(subscription.price.next.total);

      this.price.now.items.push(subscriptionItem('now', subscription));
      this.price.next.items.push(subscriptionItem('next', subscription));
    });
  }

  /**
   * TODO - document
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
  }

  /**
   * TODO - document
   *
   */
  discount () {
    const coupon = this.items.coupon;
    const round = amt => parseFloat((Math.round(amt * 100) / 100).toFixed(6));

    this.price.now.discount = 0;
    this.price.next.discount = 0;

    if (!coupon) return;

    if (coupon.discount.rate) {
      const {discountableNow, discountableNext} = this.discountableSubtotals(coupon);
      this.price.now.discount = round(discountableNow * coupon.discount.rate);
      this.price.next.discount = round(discountableNext * coupon.discount.rate);
    } else if (coupon.discount.type === 'free_trial') {
      // FIXME: apply free trials to eligible subscriptions.
      //  - how will this impact previously-computed subscription subtotals?
    } else {
      this.price.now.discount = coupon.discount.amount[this.items.currency];
      this.price.next.discount = coupon.discount.amount[this.items.currency];
    }

    if (coupon.single_use) {
      this.price.next.discount = 0;
    }
  }

  /**
   * TODO
   */
  giftCard () {
    this.price.now.giftCard = 0;
    this.price.next.giftCard = 0;
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
        discountableSubscriptions = this.items.subscriptions.slice(0);
      }

      // reject subscriptions for which this coupon does not apply
      discountableSubscriptions.filter(sub => {
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
   * Finds the subscription for which a subscription-level coupon will apply
   *
   * @return {[type]} [description]
   */
  mostValuableSubscriptionForDiscount () {
    if (this.items.subscriptions.length === 0) return;
    // FIXME: this needs to be called when applying the trial, not discount
    if (this.items.coupon.discount.type === 'free_trial') {
      return this.mostValuableSubscriptionForFreeTrial();
    } else {
      return this.mostValuableSubscription();
    }
  }

  /**
   * Finds the subscription with the greatest subtotal
   *
   * @param  {Array[SubscriptionPricing]} [subscriptions=this.items.subscriptions]
   * @return {SubscriptionPricing}
   */
  mostValuableSubscription (subscriptions = this.items.subscriptions) {
    return orderBy(subscriptions, sub => sub.price.now.subtotal, 'desc')[0];
  }

  /**
   * Finds the subscription with the shortest trial length and greatest subtotal
   *
   * @return {subscriptionPricing}
   */
  mostValuableSubscriptionForFreeTrial () {
    const trialSet = groupBy(this.items.subscriptions, trialLength);
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
  if (!subscription.plan.trial) return 0;
  const seconds = {
    day: 86400,
    week: 604800, // 7 days
    month: 2678400 // 31 days
  }[subscription.plan.trial.interval] || 0;
  return subscription.plan.trial.length * seconds;
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
