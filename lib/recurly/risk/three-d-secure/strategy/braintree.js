import loadScript from 'load-script';
import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';
import { BRAINTREE_CLIENT_VERSION } from '../../../../const/gateway-constants';

const debug = require('debug')('recurly:risk:three-d-secure:braintree');

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

  get billingInfo () {
    return this.actionToken.billing_info;
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

      const { braintree, braintreeClientToken, amount, nonce, bin, billingInfo } = this;

      const verifyCardOptions = {
        amount: amount,
        nonce: nonce,
        bin: bin,
        challengeRequested: true,
        collectDeviceData: true,
        onLookupComplete: (data, next) => {
          next();
        }
      };

      if(billingInfo != null) {
        verifyCardOptions.billingAddress = {
          givenName: billingInfo.first_name,
          surname: billingInfo.last_name,
          phoneNumber: billingInfo.phone,
          streetAddress: billingInfo.address1,
          extendedAddress: billingInfo.address2,
          locality: billingInfo.city,
          region: billingInfo.state,
          postalCode: billingInfo.zip,
          countryCodeAlpha2: billingInfo.country
        };
      }

      braintree.client.create({
        authorization: braintreeClientToken
      }).then(clientInstance => {
        return braintree.threeDSecure.create({
          client: clientInstance,
          version: 2
        });
      }).then(threeDSecureInstance => {
        return threeDSecureInstance.verifyCard(
          verifyCardOptions,
        );
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
