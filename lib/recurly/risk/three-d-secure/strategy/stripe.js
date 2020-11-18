import loadScript from 'load-script';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';

const debug = require('debug')('recurly:risk:three-d-secure:stripe');

export default class StripeStrategy extends ThreeDSecureStrategy {
  static libUrl = 'https://js.stripe.com/v3/';
  static strategyName = 'stripe';

  constructor (...args) {
    super(...args);

    debug('loading Stripe library');
    this.loadStripeLibrary()
      .catch(cause => this.threeDSecure.error('3ds-vendor-load-error', { vendor: 'Stripe', cause }))
      .then(() => {
        this.stripe = window.Stripe(this.stripePublishableKey);
        debug('Stripe checkout instance created', this.stripe);
        this.markReady();
      });
  }

  get stripePublishableKey () {
    return this.actionToken.gateway.credentials.publishable_key;
  }

  get stripeClientSecret () {
    return this.actionToken.three_d_secure.params.client_secret;
  }

  /**
   * Provides the target DOM element for which we will apply
   * fingerprint detection, challenge flows, and results
   *
   * @param {HTMLElement} element
   */
  attach (element) {
    super.attach(element);

    this.whenReady(() => {
      const isPaymentIntent = this.stripeClientSecret.indexOf('pi') === 0;
      const handleAction = isPaymentIntent ? this.stripe.handleCardAction : this.stripe.confirmCardSetup;

      handleAction(this.stripeClientSecret).then(result => {
        if (result.error) {
          return this.threeDSecure.error('3ds-auth-error', { cause: result.error });
        }
        const { id } = result.paymentIntent || result.setupIntent;
        this.emit('done', { id });
      });
    });
  }

  /**
   * Loads Stripe library dependency
   */
  loadStripeLibrary () {
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve();
      loadScript(StripeStrategy.libUrl, error => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
