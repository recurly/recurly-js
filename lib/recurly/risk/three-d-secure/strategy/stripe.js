import loadScript from 'load-script';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';

const debug = require('debug')('recurly:risk:three-d-secure:stripe');
const LIB_URL = 'https://js.stripe.com/v3/';

export default class StripeStrategy extends ThreeDSecureStrategy {
  constructor (...args) {
    super(...args);

    debug('loading Stripe library');
    this.loadStripeLibrary()
      .catch(cause => this.threeDSecure.error('3ds-vendor-load-error', { vendor: 'Stripe', cause }))
      .then(() => {
        this.stripe = window.Stripe(this.stripePublishableKey);
        debug('Stripe checkout instance created', this.stripe);
        this.markReady();
      })
      .done();
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
      this.stripe.handleCardPayment(this.stripeClientSecret).then(result => {
        if (result.error) {
          return this.threeDSecure.error('3ds-vendor-auth-error', { gateway: 'Stripe', cause });
        }
        this.emit('done', result.paymentIntent);
      });
    });
  }

  /**
   * Loads Adyen library dependency
   */
  loadStripeLibrary (done) {
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve();
      loadScript(LIB_URL, error => {
        if (error) reject(err);
        else resolve();
      })
    });
  }
}
