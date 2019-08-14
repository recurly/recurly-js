import loadScript from 'load-script';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';

const debug = require('debug')('recurly:risk:three-d-secure:braintree');
const BRAINTREE_CLIENT_VERSION = '3.11.0';

export default class BraintreeStrategy extends ThreeDSecureStrategy {

  static strategyName = 'braintree';

  constructor (...args) {
    super(...args);

    debug('loading braintree libraries');
    this.loadBraintreeLibraries()
      .catch(cause => this.threeDSecure.error('3ds-vendor-load-error', { vendor: 'Braintree', cause }))
      .then(() => {
        this.braintree = window.Braintree(this.braintreePublicKey);
        debug('Braintree checkout instance created', this.braintree);
        this.markReady();
      });
  }

  get braintreePublicKey () {
    return this.actionToken.gateway.credentials.public_key;
  }

  get nonce () {
    return this.actionToken.three_d_secure.params.payment_method_nonce;
  }

  get amount () {
    return this.actionToken.three_d_secure.params.amount;
  }

  get bin () {
    return this.actionToken.three_d_secure.params.bin;
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
      this.braintree.verifyCard({
        amount: this.amount,
        nonce: this.nonce,
        bin: this.bin,
        onLookupComplete: (data, next) => next()
      }).then(result => {
        this.emit('done', { paymentMethodNonce: result.nonce });
      }).catch(error => {
        this.threeDSecure.error('3ds-auth-error', { cause: error });
      });
    });
  }

  urlForResource (type) {
    return `https://js.braintreegateway.com/web/${BRAINTREE_CLIENT_VERSION}/js/${type}.min.js`
  }

  /**
   * Loads Braintree library dependency
   */
  loadBraintreeLibraries () {
    return new Promise((resolve, reject) => {
      if (window.Braintree) return resolve();
      loadScript(this.urlForResource('client'), error => {
        if (error) reject(error);
        else loadScript(this.urlForResource('three_d_secure'), error => {
          if (error) reject(error);
          else resolve();
        })
      })
    });
  }
}
