import loadScript from 'load-script';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';

const debug = require('debug')('recurly:risk:three-d-secure:braintree');
const BRAINTREE_CLIENT_VERSION = '3.50.0';

export default class BraintreeStrategy extends ThreeDSecureStrategy {

  static strategyName = 'braintree_blue';

  constructor (...args) {
    super(...args);

    debug('loading braintree libraries');
    this.loadBraintreeLibraries()
      .catch(cause => this.threeDSecure.error('3ds-vendor-load-error', { vendor: 'Braintree', cause }))
      .then(() => {
        this.braintree = window.braintree;
        debug('Braintree checkout instance created', this.braintree);
        this.markReady();
      });
  }

  get braintreeClientToken () {
    return this.actionToken.three_d_secure.params.client_token;
  }

  get nonce () {
    return this.actionToken.three_d_secure.params.payment_method_nonce;
  }

  get amount () {
    return this.actionToken.transaction.amount;
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
      debug('Attempting to load braintree');

      const { braintree, braintreeClientToken, amount, nonce, bin } = this;

      braintree.client.create({
        authorization: braintreeClientToken
      }).then(clientInstance => {
        return braintree.threeDSecure.create({
          client: clientInstance,
          version: 2
        });
      }).then(threeDSecureInstance => {
        return threeDSecureInstance.verifyCard({
          amount: amount,
          nonce: nonce,
          bin: bin,
          onLookupComplete: (data, next) => {
            next();
          }
        });
      }).then(({ nonce: paymentMethodNonce }) => this.emit('done', { paymentMethodNonce }))
        .catch(cause => this.threeDSecure.error('3ds-auth-error', { cause }));
    });
  }

  urlForResource (type) {
    return `https://js.braintreegateway.com/web/${BRAINTREE_CLIENT_VERSION}/js/${type}.min.js`;
  }

  /**
   * Loads Braintree library dependency
   */
  loadBraintreeLibraries () {
    return new Promise((resolve, reject) => {
      if (window.braintree && window.braintree.client && window.braintree.threeDSecure) return resolve();
      loadScript(this.urlForResource('client'), error => {
        if (error) reject(error);
        else loadScript(this.urlForResource('three-d-secure'), error => {
          if (error) reject(error);
          else resolve();
        });
      });
    });
  }
}
