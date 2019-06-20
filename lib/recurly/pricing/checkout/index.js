import clone from 'component-clone';
import find from 'component-find';
import intersection from 'intersect';
import isEmpty from 'lodash.isempty';
import Promise from 'promise';
import uniq from 'array-unique';
import uuid from '../../../util/base64-uuid';
import errors from '../../errors';
import { Pricing } from '../';
import PricingPromise from '../promise';
import SubscriptionPricing from '../subscription';
import EmbeddedSubscriptionPricing from '../subscription/embedded';
import Calculations from './calculations';
import Attachment from './attachment';

const debug = require('debug')('recurly:pricing:checkout-pricing');

/**
 * checkoutPricing = recurly.Pricing.Checkout();
 */

export default class CheckoutPricing extends Pricing {
  constructor (...args) {
    super(...args);
    this.debug = debug;
    this.recurly.report('pricing:checkout:create');
  }

  reset () {
    super.reset();
    this.items.subscriptions = [];
    this.items.adjustments = [];
  }

  get Calculations () {
    return Calculations;
  }

  get PRICING_METHODS () {
    return super.PRICING_METHODS.concat([
      'address',
      'adjustment',
      'coupon',
      'currency',
      'giftCard',
      'shippingAddress',
      'subscription',
      'tax'
    ]);
  }

  get validAdjustments () {
    return this.items.adjustments.filter(adj => adj.currency === this.items.currency);
  }

  get validSubscriptions () {
    return this.items.subscriptions.filter(sub => sub.isValid);
  }

  // Currency codes common to all subscriptions
  get subscriptionCurrencies () {
    return intersection(this.validSubscriptions.map(s => Object.keys(s.items.plan.price)));
  }

  // Plan codes of all subscriptions
  get subscriptionPlanCodes () {
    return uniq(this.validSubscriptions.map(s => s.items.plan.code));
  }

  findSubscriptionById (id) {
    const embeddedSubscription = find(this.items.subscriptions, esub => esub.id === id);
    if (embeddedSubscription) return embeddedSubscription.subscription;
  }

  /**
   * Attachment factory
   *
   * @param {HTMLElement} container - element on which to attach
   */
  attach (container) {
    if (this.attachment) this.attachment.detach();
    this.attachment = new Attachment(this, container);
    this.attachment.once('ready', () => this.emit('attached'));
    return this.attachment;
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
        return this.error(errors('invalid-currency', {
          currency: code,
          allowed: this.subscriptionCurrencies
        }), reject, 'currency');
      }

      this.items.currency = code;

      // Propagate currency changes to each subscription
      Promise.all(this.validSubscriptions.map(sub => {
        debug('checkout currency has changed. Updating subscription', sub);
        return sub.currency(code).reprice();
      }))
        // Eject gift cards on currency change
        .then(() => this.giftCard(null))
        .then(() => this.resolveAndEmit('set.currency', code, resolve));
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

      const plan = subscription.items.plan;

      // If the subscription currencies do not match the checkout currency, attempt to resolve it.
      // If it cannot be resolved, reject the subscription
      if (this.items.currency && plan) {
        const planCurrencies = Object.keys(plan.price);
        if (!~planCurrencies.indexOf(this.currencyCode)) {
          try {
            this.resolveCurrency(planCurrencies);
          } catch (e) {
            return this.error(errors('invalid-subscription-currency', {
              checkoutCurrency: this.currencyCode,
              checkoutSupportedCurrencies: this.subscriptionCurrencies,
              subscriptionPlanCurrencies: planCurrencies
            }), reject, 'currency');
          }
        }
      }

      if (!this.items.currency) this.currency(subscription.items.currency);

      const emitSubscriptionSetter = name => {
        return item => this.emit(`set.${name}`, { subscription: { id: subscription.id }, [name]: item });
      };

      const addSubscription = () => {
        subscription.on('change:external', () => this.reprice());
        subscription.on('set.plan', emitSubscriptionSetter('plan'));
        subscription.on('set.addon', emitSubscriptionSetter('addon'));
        this.items.subscriptions.push(new EmbeddedSubscriptionPricing(subscription, this));
        this.resolveAndEmit('set.subscription', subscription, resolve, { copy: false });
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
   * @param {Object}  adjustment
   * @param {Number}  adjustment.amount in unit price (1.0 for USD, etc)
   * @param {Number}  [adjustment.quantity=1] number of units
   * @param {String}  [adjustment.id=uuid()] unique identifier
   * @param {String}  [adjustment.currency=this.items.currency] currency code
   * @param {Boolean} [adjustment.taxExempt=false] whether this adjustment is tax exempt
   * @param {String}  [adjustment.taxCode] taxation code
   * @return {PricingPromise}
   * @public
   */
  adjustment ({ amount, quantity, id = uuid(), currency, taxExempt, taxCode }) {
    return new PricingPromise((resolve, reject) => {
      let existingAdjustment = find(this.items.adjustments, a => a.id === id);
      let validateAmount = true;

      if (existingAdjustment && typeof amount === 'undefined') {
        validateAmount = false;
      }

      if (validateAmount) {
        amount = Number(amount);
        if (!isFinite(amount)) {
          let err = { name: 'amount', expect: 'a finite Number' }
          return this.error(errors('invalid-option', err), reject, 'adjustment');
        }
      }

      let adjustment = {};

      if (existingAdjustment) {
        // Only pick present attributes
        if (typeof amount !== 'undefined') adjustment.amount = amount;
        if (typeof currency !== 'undefined') adjustment.currency = currency;
        if (typeof quantity !== 'undefined') adjustment.quantity = parseInt(quantity, 10);
        if (typeof taxExempt !== 'undefined') adjustment.taxExempt = taxExempt;
        if (typeof taxCode !== 'undefined') adjustment.taxCode = taxCode;

        Object.assign(existingAdjustment, adjustment);
      } else {
        // Adjustment defaults
        quantity = parseInt(quantity, 10);
        if (isNaN(quantity)) quantity = 1;
        currency = currency || this.items.currency;
        taxExempt = !!taxExempt;

        adjustment = { amount, quantity, id, currency, taxExempt, taxCode };

        this.items.adjustments.push(adjustment);
      }

      this.resolveAndEmit('set.adjustment', adjustment, resolve);
    }, this);
  }

  /**
   * Updates coupon. Manages a single coupon on the item set, unsetting any exisitng
   * coupon
   *
   * `set.coupon` is emitted when a valid coupon is set
   * `unset.coupon` is emitted when an existing valid coupon is removed
   * `error.coupon` is emitted when the requested coupon is invalid
   *
   * @param {String} couponCode
   * @return {PricingPromise}
   * @public
   */
  coupon (couponCode) {
    if (~this.couponCodes.indexOf(couponCode)) {
      return new PricingPromise(resolve => resolve(clone(this.items.coupon)), this);
    }

    return new PricingPromise(resolve => resolve(), this)
      .then(() => {
        if (!this.items.coupon) return;
        const priorCoupon = clone(this.items.coupon);
        debug('unset.coupon');
        return this.remove({ coupon: priorCoupon.code })
          .then(() => {
            this.emit('unset.coupon', priorCoupon);
          });
      })
      .then(() => new PricingPromise((resolve, reject) => {
        // A blank coupon is handled as ok
        if (!couponCode) return resolve();

        this.recurly.coupon({ plans: this.subscriptionPlanCodes, coupon: couponCode }, (err, coupon) => {
          if (err) {
            return this.error(err, reject, 'coupon');
          } else {
            this.items.coupon = coupon;
            this.resolveAndEmit('set.coupon', coupon, resolve);
          }
        });
      }));
  }

  /**
   * Updates address
   *
   * @param {Object} address
   * @param {String} address.country
   * @param {String} address.postalCode
   * @param {String} address.vatNumber
   * @return {PricingPromise}
   * @public
   */
  address (address) {
    return new PricingPromise(this.itemUpdateFactory('address', address), this);
  }

  /**
   * Updates shipping address
   *
   * @param {Object} address
   * @param {String} address.country
   * @param {String} address.postalCode
   * @param {String} address.vatNumber
   * @return {PricingPromise}
   * @public
   */
  shippingAddress (address) {
    return new PricingPromise(this.itemUpdateFactory('shippingAddress', address), this);
  }

  /**
   * Updates tax info
   *
   * @param {Object} tax
   * @param {String} tax.vatNumber
   * @param {Object} [tax.amounts] specific tax amounts. Overrides automated tax rate calculations
   * @param {Object} [tax.amounts.now] specific tax to apply on the immediate charge
   * @param {Object} [tax.amounts.next=0] specific tax to apply on the next billing cycle
   * @public
   */
  tax (tax) {
    this.guardTaxSignature(tax);
    return new PricingPromise(this.itemUpdateFactory('tax', tax), this);
  }

  /**
   * Updates gift card
   *
   * @param {String} code Gift card code
   * @return {PricingPromise} [description]
   * @public
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
            this.items.giftCard = giftCard;
            this.resolveAndEmit('set.giftCard', giftCard, resolve);
          }
        }
      });
    }, this);
  }

  /**
   * Adds handlers to remove subscriptions, adjustments, and coupons
   *
   * @param {Object} options
   * @param {Object} options[item] Must contain an id property. The key name
   *                               corresponds to the item type to be removed (ex: 'subscription')
   * @public
   */
  remove (options) {
    return new PricingPromise((resolve, reject) => {
      // Expects SubscriptionPricing or EmbeddedSubscriptionPricing
      if (options.subscription) {
        this.removeFromSet('subscriptions', options.subscription);
      } else if (options.adjustment) {
        this.removeFromSet('adjustments', options.adjustment);
      } else {
        if (options.coupon) {
          // Remove the coupon from embedded subscriptions
          Promise.all(this.validSubscriptions.map(sub => sub.coupon().reprice({ internal: true })))
            .then(() => super.remove(options).then(resolve, reject));
        } else {
          super.remove(options).then(resolve, reject);
        }
      }
    });
  }

  /**
   * Removes a set item (subscription or adjustment)
   *
   * @param  {String} name         item name (ex: 'subscription', 'adjustment')
   * @param  {Object} itemToRemove item to remove. Must have an id property
   * @private
   */
  removeFromSet (name, itemToRemove) {
    this.items[name] = this.items[name].filter(item => item.id !== itemToRemove.id);
  }

  /**
   * Checks whether the current subscriptions will allow the given currency code
   *
   * @param  {String} code Currency code
   * @return {Boolean}
   * @private
   */
  subscriptionsAllowCurrency (code) {
    if (isEmpty(this.items.subscriptions)) return true;
    return !!~this.subscriptionCurrencies.indexOf(code);
  }

  /**
   * Attempts to set a common currency from amongst the
   * current subscriptions and the provided codes.
   *
   * @param {Array} code Array of {String} currency codes
   * @param {Object} [options]
   * @param {Boolean} [options.commit=true] whether to commit a currency change
   * @throws {Error} If a common currency cannot be found
   * @private
   */
  resolveCurrency (codes, { commit = true } = {}) {
    let commonCurrencies;

    // If we have subscriptions already, check that we have common currencies. Otherwise, we may proceed
    if (isEmpty(this.validSubscriptions)) {
      commonCurrencies = codes;
    } else {
      commonCurrencies = intersection(this.subscriptionCurrencies, codes);
    }

    if (isEmpty(commonCurrencies)) throw new Error('unresolvable');
    if (commit) return this.currency(commonCurrencies[0]);
  }

  /**
   * Binds important events to the EventDispatcher
   *
   * @protected
   */
  bindReporting () {
    super.bindReporting('pricing:checkout');
    const report = (...args) => this.recurly.report(...args);
    this.on('attached', () => report('pricing:checkout:attached'));
    this.on('set.subscription', subscription => report('pricing:checkout:set:subscription'));
    this.on('change:external', price => report('pricing:checkout:change', {
      price: {
        couponCodes: this.couponCodes,
        currency: this.currencyCode,
        discount: price.now.discount,
        giftCard: price.now.giftCard,
        items: price.now.items.map(item => ({
          type: item.type,
          amount: item.amount,
          quantity: item.quantity,
        })),
        taxes: price.now.taxes,
        total: price.now.total,
        totalNext: price.next.total
      }
    }));
  }
}
