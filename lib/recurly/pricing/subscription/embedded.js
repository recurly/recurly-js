import errors from '../../../errors';
import PricingPromise from '../promise';
import SubscriptionPricing from './';

const DISABLED_METHODS = [
  'coupon',
  'giftcard',
  'address',
  'shippingAddress'
];

/**
 * Wraps a SubscriptionPricing to be embedded in CheckoutPricing
 *
 * - disables impertinent methods on the original subscriptionPricing
 *   in place
 * - proxies the orignal methods on the new
 *   EmbeddedSubscriptionPricing instance
 *
 * @param {SubscriptionPricing} subscriptionPricing
 * @constructor
 */
export default class EmbeddedSubscriptionPricing {
  constructor (subscriptionPricing) {
    this.subscription = subscriptionPricing;

    DISABLED_METHODS.forEach(name => {
      const original = subscriptionPricing[name];
      subscriptionPricing[name] = disabledResolverFactory(name, subscriptionPricing)
      this[name] = original.bind(subscriptionPricing);
    });
  }

  get items () {
    return this.subscription.items;
  }

  get price () {
    return this.subscription.price;
  }
}

function disabledResolverFactory (method, subscriptionPricing) {
  return () => new PricingPromise((res, rej) => res(), subscriptionPricing);
}
