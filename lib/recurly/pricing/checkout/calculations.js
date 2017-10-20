import each from 'component-each';
import decimalizeMember from '../../../util/decimalize-member';

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
      now: {},
      next: {},
      base: {
        subscriptions: {},
        adjustments: {}
      },
      currency: {
        code: this.items.currency,
        // FIXME: currency symbol
        symbol: '$'
      },
      taxes: []
    };

    this.subtotal();

    done(this.price);

    // this.tax(function () {
    //   this.total();
    //   this.giftcard();

    //   each(this.price.base.subscriptions, decimalizeMember, this.price.base.subscriptions);
    //   each(this.price.base.adjustments, decimalizeMember, this.price.base.adjustments);

    //   each(this.price.now, decimalizeMember, this.price.now);
    //   each(this.price.next, decimalizeMember, this.price.next);
    //   done(this.price);
    // });
  }

  /**
   * TODO
   */
  subtotal () {
    this.price.now.subtotal = 0;
    this.price.next.subtotal = 0;

    this.subscriptions();
    this.price.now.subtotal += 0;
    this.price.next.subtotal += 0;
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
  tax () {

  }

  /**
   * TODO
   */
  subscriptions () {
    // this.price.base.subscriptions = this.items.subscriptions.map(subscription => {
    //   // TODO: slice the price, cut taxes, etc
    //   return subscription.price;
    // }, 0);
  }

  /**
   * TODO
   */
  adjustments () {
    this.price.base.adjustments = this.items.adjustments.map(adjustment => {
      // TODO: slice the price, cut taxes, etc
      return { unit: amount, quantity } = adjustment;
    }, 0);
  }

  /**
   * TODO
   */
  discount () {

  }

  /**
   * TODO
   */
  giftcard () {

  }
}
