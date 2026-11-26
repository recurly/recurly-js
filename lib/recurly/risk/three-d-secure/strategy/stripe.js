import _debug from 'debug';
import loadScript from 'load-script';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';

const debug = _debug('recurly:risk:three-d-secure:stripe');

export default class StripeStrategy extends ThreeDSecureStrategy {
  static libUrl = 'https://js.stripe.com/v3/';
  static strategyName = 'stripe';
  // Intent statuses which Stripe.js reports without error once any required action is complete
  static COMPLETED_INTENT_STATUSES = ['succeeded', 'processing', 'requires_capture'];

  constructor (...args) {
    super(...args);

    debug('loading Stripe library');
    this.loadStripeLibrary()
      .then(() => {
        this.stripe = window.Stripe(this.stripePublishableKey);
        debug('Stripe checkout instance created', this.stripe);
        this.markReady();
      })
      .catch(cause => this.threeDSecure.error('3ds-vendor-load-error', { vendor: 'Stripe', cause }));
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
      const handleResult = result => {
        if (result.error) {
          throw result.error;
        }
        const { id } = result.paymentIntent || result.setupIntent;
        this.emit('done', { id });
      };
      const handleError = err => this.threeDSecure.error('3ds-auth-error', { cause: err });

      this.stripe.handleNextAction({ clientSecret: this.stripeClientSecret })
        .then(handleResult)
        .catch(err => {
          // Handle an intent which has already had its action handled
          if (err.name === 'IntegrationError') {
            return this.stripe[isPaymentIntent ? 'retrievePaymentIntent' : 'retrieveSetupIntent'](this.stripeClientSecret)
              .then(result => {
                if (result.error) {
                  throw result.error;
                }

                const { next_action: nextAction, status } = result.paymentIntent || result.setupIntent;
                if (!nextAction && StripeStrategy.COMPLETED_INTENT_STATUSES.includes(status)) {
                  return handleResult(result);
                }

                throw err;
              })
              .catch(handleError);
          }

          return handleError(err);
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
