import intersection from 'lodash.intersection';
import isEmpty from 'lodash.isempty';
import isFinite from 'lodash.isfinite';
import uniq from 'lodash.uniq';
import errors from '../../../errors';
import uuid from '../../../util/uuid';
import {Pricing} from '../';
import PricingPromise from '../promise';
import SubscriptionPricing from '../subscription';
import EmbeddedSubscriptionPricing from '../subscription/embedded';
import Calculations from './calculations';

const debug = require('debug')('recurly:pricing:checkout-pricing');

// FIXME: This is used by Pricing.remove, which must be updated for sets
const PROPERTIES = [
  'subscription',
  'adjustment',
  'coupon',
  'address',
  'currency',
  'giftCard',
];

/**
 * checkoutPricing = recurly.Pricing.Checkout();
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

  // Plan codes of all subscriptions
  get subscriptionPlanCodes () {
    return uniq(this.items.subscriptions.map(s => s.items.plan.code));
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
   * @return {PricingPromise}
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
   * - Removes subscription discounts
   *
   * @param {SubscriptionPricing} subscription
   * @return {PricingPromise}
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
      if (this.items.subscriptions.some(esub => esub.subscription === subscription)) {
        return resolve(subscription);
      }

      // FIXME: If a `subscription` plan changes, we must reject the plan if its currency is
      //        not supported by all other subscriptions on the CheckoutPricing
      //        - fix?: Add a change listener that errors the plan change.. would need a
      //                hook on SubscriptionPricing.plan
      //        - fix?: May want to wrap `subscription` in a new class that handles
      //                CheckoutPricing-embedded SubscriptionPricings..
      const plan = subscription.items.plan;

      // If the subscription currencies do not match the checkout currency, attempt to resolve it.
      // If it cannot be resolved, reject the subscription
      if (this.items.currency && plan) {
        const planCurrencies = Object.keys(plan.price);
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
      }

      if (this.items.currency) this.currency(subscription.items.currency);

      const addSubscription = () => {
        subscription.on('change:external', () => this.reprice());
        this.items.subscriptions.push(new EmbeddedSubscriptionPricing(subscription));
        debug('set.subscription');
        this.emit('set.subscription', subscription);
        resolve(subscription);
      }

      // Removes any subscription coupons and gift cards
      if (subscription.isValid) {
        subscription.coupon(null).giftcard(null).then(addSubscription);
      } else {
        addSubscription();
      }
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
   * @return {PricingPromise}
   * @public
   */
  adjustment ({amount, quantity = 1, code = uuid(), taxExempt = false, taxCode}) {
    return new PricingPromise((resolve, reject) => {
      amount = Number(amount);
      if (!isFinite(amount)) {
        let err = { name: 'amount', expect: 'a finite Number' }
        return this.error(errors('invalid-option', err), reject, 'adjustment');
      }

      if (this.items.adjustments.some(a => a.code === code)) {
        let err = { name: 'code', expect: 'a unique identifier' };
        return this.error(errors('invalid-option', err), reject, 'adjustment');
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
   * @return {PricingPromise}
   * @public
   */
  coupon (couponCode) {
    const unset = () => {
      debug('unset.coupon');
      delete this.items.coupon;
      this.emit('unset.coupon');
    };

    return new PricingPromise((resolve, reject) => {
      if (this.items.coupon) this.remove({ coupon: this.items.coupon.code });

      // A blank coupon is handled as ok
      if (!couponCode) {
        unset();
        return resolve();
      }

      this.recurly.coupon({ plans: this.subscriptionPlanCodes, coupon: couponCode }, (err, coupon) => {
        if (err && err.code === 'not-found') {
          unset();
          return resolve();
        }
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
  }

  /**
   * Updates address
   *
   * @param {Object} address
   * @param {String} address.country
   * @param {String|Number} address.postal_code
   * @param {String} address.vat_number
   * @param {Function} [done] callback
   * @return {PricingPromise}
   * @public
   */
  address (address, done) {
    return new PricingPromise(this.itemUpdateFactory('address', address), this);
  }

  /**
   * Updates gift card
   *
   * @param {String} code Gift card code
   * @return {PricingPromise} [description]
   */
  giftCard (code) {
    const unset = () => {
      if (!this.items.giftCard) return;
      debug('unset.giftCard');
      delete this.items.giftCard;
      this.emit('unset.giftCard');
    }

    return new PricingPromise((resolve, reject) => {
      if (!code) {
        unset();
        return resolve();
      }

      this.recurly.giftCard({ giftcard: code }, (err, giftCard) => {
        if (err) {
          return this.error(err, reject, 'giftCard');
        } else {
          unset();
          if (this.items.currency !== giftCard.currency){
            return this.error(errors('gift-card-currency-mismatch'), reject, 'giftCard');
          } else {
            debug('set.giftCard');
            this.items.giftCard = giftCard;
            this.emit('set.giftCard', giftCard);
            resolve(giftCard);
          }
        }
      });
    }, this);
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
