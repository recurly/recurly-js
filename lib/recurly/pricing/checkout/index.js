import Pricing from '../index';
import PricingPromise from '../promise';
import SubscriptionPricing from '../subscription';

export default class CheckoutPricing extends Pricing {
  /**
   * Attachment factory
   *
   * @param {HTMLElement} container - element on which to attach
   */
  attach () {

  }

  /**
   * Updates or retrieves currency code
   *
   * @param {String} code
   * @public
   */
  currency () {

  }

  /**
   * Adds a subscription
   *
   * @param {SubscriptionPricing} subscriptionPricing
   * @public
   */
  subscription () {

  }

  /**
   * Adds a one-time charge
   *
   * @param {Object} options
   * @param {Number} options.amount in unit price (1.0 for USD, etc)
   * @public
   */
  charge () {

  }

  /**
   * Adds a coupon
   *
   * @return {[type]} [description]
   * @public
   */
  coupon () {

  }
}

