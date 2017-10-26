import intersection from 'lodash.intersection';
import isEmpty from 'lodash.isempty';
import isFinite from 'lodash.isfinite';
import errors from '../../../errors';
import uuid from '../../../util/uuid';
import {Pricing} from '../';
import PricingPromise from '../promise';
import SubscriptionPricing from '../subscription';
import Calculations from './calculations';

const debug = require('debug')('recurly:pricing:checkout-pricing');

const PROPERTIES = [
  'subscription',
  'adjustment',
  'coupon',
  'address',
  'currency',
  'gift_card',
];

/**
 * subscriptionPricing = recurly.Pricing.Subscription():
 *
 *  ... apply plan, addons, address, etc to subscriptionPricing
 *
 * - TODO: this does not support the SubscriptionPricing callback pattern. Should it?
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
    this.items.adjustments = [];
  }

  get Calculations () {
    return Calculations;
  }

  // Currency codes common to all subscriptions
  get subscriptionCurrencies () {
    return intersection(this.items.subscriptions.map(s => Object.keys(s.items.plan.price)));
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
          code,
          allowed: this.subscriptionCurrencies
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
        return this.error(errors('invalid-option', {
          name: 'subscription',
          expect: 'a {recurly.Pricing.Subscription}'
        }), reject, 'subscription');
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


      if (this.items.currency) {
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
      } else {
        // If no checkout currency has been set, use the currency from this subscription
        this.currency(subscription.items.currency);
      }

      this.items.subscriptions.push(subscription);

      debug('set.subscription');
      this.emit('set.subscription', subscription);
      resolve(subscription);
    }, this);
  }

  /**
   * Adds a one-time charge or credit a.k.a. adjustment
   *
   * - TODO: Finalize adjustment object format. Quantity?
   *
   * @param {Object}  adjustment
   * @param {Number}  adjustment.amount in unit price (1.0 for USD, etc)
   * @param {Number}  [adjustment.quantity=1] number of units
   * @param {String}  [adjustment.code=uuid()] unique identifier
   * @param {Boolean} [adjustment.taxExempt=false] whether this adjustment is tax exempt
   * @param {String}  [adjustment.taxCode] taxation code
   * @public
   */
  adjustment ({amount, quantity = 1, code = uuid(), taxExempt = false, taxCode}) {
    return new PricingPromise((resolve, reject) => {
      amount = Number(amount);
      if (!isFinite(amount)) {
        return this.error(errors('invalid-option', {
          name: 'amount',
          expect: 'a finite Number'
        }), reject, 'adjustment');
      }

      quantity = parseInt(quantity, 10);
      taxExempt = !!taxExempt;

      let adjustment = { amount, quantity, code, taxExempt };
      if (taxCode) adjustment.taxCode = taxCode;

      this.items.adjustments.push(adjustment);

      debug('set.adjustment');
      this.emit('set.adjustment', adjustment);
      resolve(adjustment);
    }, this);
  }

  /**
   * Updates coupon. Manages a single coupon on the item set, unsetting any exisitng
   * coupon
   *
   * @param {String} couponCode
   * @public
   */

  coupon (couponCode) {
    return new PricingPromise((resolve, reject) => {
      // TODO: Are more item prsence validations needed?
      if (this.items.coupon) this.remove({ coupon: this.items.coupon.code });

      // A blank coupon is handled as ok
      if (!couponCode) {
        unset();
        return resolve();
      }

      // TODO: update coupon method to be unbound from plans
      this.recurly.coupon({ plan: this.items.plan.code, coupon: couponCode }, (err, coupon) => {
        if (err && err.code === 'not-found') unset();

        if (err) {
          return this.error(err, reject, 'coupon');
        } else {
          debug('set.coupon');
          this.items.coupon = coupon;
          this.emit('set.coupon', coupon);
          resolve(coupon);
        }
      });
    }, this);

    function unset (err) {
      debug('unset.coupon');
      delete this.items.coupon;
      this.emit('unset.coupon');
    }
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
