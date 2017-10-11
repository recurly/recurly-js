import intersection from 'lodash.intersection';
import isEmpty from 'lodash.isEmpty';
import isFinite from 'lodash.isfinite';
import {Pricing} from '../';
import PricingPromise from '../promise';
import SubscriptionPricing from '../subscription';
import Calculations from './calculations';

const debug = require('debug')('recurly:pricing:checkout-pricing');

const PROPERTIES = [
  'subscription',
  'charge',
  'coupon',
  'address',
  'currency',
  'gift_card',
];

/**
 * subscriptionPricing = recurly.Pricing.Subscription():
 *
 *  ... apply plan, addons, address, etc to subscriptionPricing
 */

export default class CheckoutPricing extends Pricing {
  constructor (...args) {
    super(...args);
    this.debug = debug;
    this.PROPERTIES = PROPERTIES;
  }

  reset () {
    super.reset();
    this.items.subscriptions = [];
    this.items.charges = [];
  }

  get Calculations () {
    return Calculations;
  }

  get subscriptionCurrencies () {
    return intersection(this.items.subscriptions.map(p => Object.keys(p.price)));
  }

  /**
   * Attachment factory
   *
   * @param {HTMLElement} container - element on which to attach
   */
  attach () {

  }

  /**
   * Updates currency code. Will reject if the subscription plans do not support the given code
   *
   * @param {String} code Currency code
   * @public
   */
  currency (code) {
    return new PricingPromise((resolve, reject) => {
      if (this.items.currency === code) return resolve(this.items.currency);
      if (!this.subscriptionsAllowCurrency(code)) {
        // TODO: Check the semantics of this error. Probably needs to be updated for CheckoutPricing
        return this.error(errors('invalid-currency', {
          currencyCode: code,
          planCurrencies: this.subscriptionCurrencies
        }), reject, 'currency');
      }

      this.items.currency = code;

      debug('set.currency');
      this.emit('set.currency', code);
      resolve(code);
    }, this);
  }

  /**
   * Adds a subscription
   *
   * - Ignores address and tax info from subscriptions
   *
   * @param {SubscriptionPricing} subscription
   * @public
   */
  subscription (subscription) {
    return new PricingPromise((resolve, reject) => {
      if (!(subscription instanceof SubscriptionPricing)) {
        return this.error(errors('invalid-subscription'), reject, 'subscription');
      }

      // Do nothing if we already have this subscription
      if (~this.items.subscriptions.indexOf(subscription)) return resolve(subscription);

      // Error if the subscription plan does not support the set currency
      // FIXME: If a `subscription` plan changes, we must reject the plan if its currency is
      //        not supported by all other subscriptions on the CheckoutPricing
      //        - fix?: Add a change listener that errors the plan change.. would need a
      //                hook on SubscriptionPricing.plan
      //        - fix?: May want to wrap `subscription` in a new class that handles
      //                CheckoutPricing-embedded SubscriptionPricings..
      const plan = subscription.items.plan;
      const planCurrencies = Object.keys(plan.price);

      // If the subscription currencies do not match the checkout currency, attempt to resolve it.
      // If it cannot be resolved, reject the subscription
      if (!~planCurrencies.indexOf(this.items.currency)) {
        try {
          this.resolveCurrency(planCurrencies);
        } catch (e) {
          return this.error(errors('invalid-subscription-currency', {
            checkoutCurrency: this.items.currency,
            checkoutSupportedCurrencies: this.subscriptionCurrencies,
            subscriptionPlanCurrencies: planCurrencies
          }), reject, 'currency');
        }
      }

      this.subscriptions.push(subscription);

      debug('set.subscription');
      self.emit('set.subscription', subscription);
      resolve(subscription);
    });
  }

  /**
   * Adds a one-time charge
   *
   * - TODO: Finalize charge object format. Quantity?
   *
   * @param {Object} charge
   * @param {Number} charge.amount in unit price (1.0 for USD, etc)
   * @public
   */
  charge (charge) {
    return new PricingPromise((resolve, reject) => {
      // TODO: Finalize charge validations
      if (typeof charge !== 'object') return this.error(errors('invalid-charge', { charge }), reject, 'charge');

      charge.amount = Number(charge.amount);
      if (!isFinite(charge.amount)) return this.error(errors('invalid-charge', { charge }), reject, 'charge');

      this.charges.push(charge);

      debug('set.charge');
      self.emit('set.charge', charge);
      resolve(charge);
    });
  }

  /**
   * Adds a coupon
   *
   * @public
   */
  coupon () {

  }

  /**
   * Updates address
   *
   * @param {Object} address
   * @param {String} address.country
   * @param {String|Number} address.postal_code
   * @param {String} address.vat_number
   * @param {Function} [done] callback
   * @public
   */

  address (address, done) {
    return new PricingPromise(this.itemUpdateFactory('address', address), this);
  }

  tax () {

  }

  /**
   * Checks whether the current subscriptions will allow the given currency code
   *
   * @param  {String} code Currency code
   * @return {Boolean}
   */
  subscriptionsAllowCurrency (code) {
    if (isEmpty(this.items.subscriptions)) return true;
    return !!~this.subscriptionCurrencies.indexOf(code);
  }

  /**
   * Attempts to set a common currency from amongst the subscriptions and the provided code.
   *
   * @param {Array} code Array of {String} currency codes
   * @throws {Error} If a common currency cannot be found
   * @private
   */
  resolveCurrency (codes) {
    let commonCurrencies;

    // If we have subscriptions already, check that we have common currencies. Otherwise, we may proceed
    if (isEmpty(this.items.subscriptions)) {
      commonCurrencies = codes;
    } else {
      commonCurrencies = intersection(this.subscriptionCurrencies, codes);
    }

    if (isEmpty(commonCurrencies)) throw new Error('unresolvable');
    this.currency(commonCurrencies[0]);
  }
}
