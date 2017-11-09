import errors from '../../../errors';
import PricingPromise from '../promise';
import SubscriptionPricing from './';

export const DISABLED_METHODS = [
  'address',
  'coupon',
  'currency',
  'giftcard',
  'shippingAddress'
];

export const DEFERRED_METHODS = [
  'couponIsValidForSubscription'
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

    DISABLED_METHODS.forEach(method => {
      const original = subscriptionPricing[method];
      subscriptionPricing[method] = disabledResolverFactory(method, subscriptionPricing)
      this[method] = original.bind(subscriptionPricing);
    });

    DEFERRED_METHODS.forEach(method => {
      this[method] = (...args) => this.subscription[method](...args);
    });
  }

  get isValid () {
    return this.subscription.isValid;
  }

  get items () {
    return this.subscription.items;
  }

  get price () {
    return this.subscription.price;
  }

  get taxCode () {
    return this.subscription.taxCode;
  }
}

function disabledResolverFactory (method, subscriptionPricing) {
  return () => new PricingPromise((res, rej) => res(), subscriptionPricing);
}
