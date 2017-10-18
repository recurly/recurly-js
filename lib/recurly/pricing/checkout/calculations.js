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

    this.price = {
      now: {},
      next: {},
      base: {
        subscriptions: {},
        adjustments: {}
      },
      currency: {
        code: this.items.currency,
        symbol: this.planPrice().symbol
      }
    };

    this.subtotal();

    this.tax(function () {
      this.total();
      this.giftcard();

      // TODO: is this necessary for CheckoutPricing?
      each(this.price.base.plan, decimalizeMember, this.price.base.plan);
      each(this.price.base.addons, decimalizeMember, this.price.base.addons);

      each(this.price.now, decimalizeMember, this.price.now);
      each(this.price.next, decimalizeMember, this.price.next);
      done(this.price);
    });
  }
}
