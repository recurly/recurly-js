import errors from '../../errors';
import PricingPromise from '../promise';
import SubscriptionPricing from './';

export const DISABLED_METHODS = [
  'address',
  'coupon',
  'currency',
  'giftcard',
  'shippingAddress',
  'bindDispatchedEvents'
];

export const DEFERRED_METHODS = [
  'couponIsValidForSubscription',
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
  constructor (subscriptionPricing, checkoutPricing) {
    this.subscription = subscriptionPricing;
    this.checkout = checkoutPricing;

    DISABLED_METHODS.forEach(method => {
      const original = subscriptionPricing[method];
      subscriptionPricing[method] = disabledResolverFactory(method, subscriptionPricing)
      this[method] = original.bind(subscriptionPricing);
    });

    DEFERRED_METHODS.forEach(method => {
      this[method] = (...args) => subscriptionPricing[method](...args);
    });

    subscriptionPricing.plan = this.plan.bind(this);
  }

  get id () {
    return this.subscription.id;
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

  get taxExempt () {
    return this.subscription.taxExempt;
  }

  /**
   * Plan setter
   *
   * - Overrides SubscriptionPricing.plan
   * - Adds additional currency check before setting plan
   * - Adds checkout currency resolution after the plan is set
   *
   * @param {String} planCode
   * @param {Object} [meta]
   * @param {Number} [meta.quantity]
   * @param {Function} [done] callback
   * @return {PricingPromise}
   */
  plan (...args) {
    let { currentPlan, quantity, planCode, options, done } = this.subscription.resolvePlanOptions(...args);

    return new PricingPromise((resolve, reject) => {
      if (currentPlan && currentPlan.code === planCode) {
        currentPlan.quantity = quantity;
        return resolve(currentPlan);
      }

      this.checkout.recurly.plan(planCode, (err, plan) => {
        if (err) return this.subscription.error(err, reject, 'plan');

        // Check if the new plan will resolve with the checkout currencies
        if (this.checkout.items.subscriptions.length > 1) {
          try {
            this.checkout.resolveCurrency(Object.keys(plan.price), { commit: false });
          } catch (err) {
            return reject(errors('invalid-plan-currency', {
              planCode: plan.code,
              currencies: this.checkout.subscriptionCurrencies
            }));
          }
        }

        plan.quantity = quantity;
        this.subscription.items.plan = plan;

        const finish = () => {
          this.subscription.emit('set.plan', plan);
          resolve(plan);
        }

        if (this.checkout.currencyCode in plan.price) {
          finish();
        } else {
          // update currencies on checkout, which will propagate the
          // change to the subscriptions
          try {
            this.checkout.resolveCurrency(Object.keys(plan.price)).then(finish);
          } catch (e) {
            reject(err);
          }
        }
      });
    }, this.subscription).nodeify(done);
  }
}

function disabledResolverFactory (method, subscriptionPricing) {
  return () => new PricingPromise((res, rej) => res(), subscriptionPricing);
}
