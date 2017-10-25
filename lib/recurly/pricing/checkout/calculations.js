import each from 'component-each';
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
   * TODO
   */
  discount () {
    this.price.now.discount = 0;
    this.price.next.discount = 0;
  }

  /**
   * TODO
   */
  giftCard () {
    this.price.now.giftCard = 0;
    this.price.next.giftCard = 0;
  }
}

/**
 * Utilities
 */

/**
 * builds a price.items[{type: 'subscription'}] item
 *
 * @param  {String} when         'now' or 'next'
 * @param  {SubscriptionPricing} subscription
 * @return {Object}              item
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
