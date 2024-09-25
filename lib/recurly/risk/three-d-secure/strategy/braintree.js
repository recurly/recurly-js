import BraintreeLoader from '../../../../util/braintree-loader';
import ThreeDSecureStrategy from './strategy';

const debug = require('debug')('recurly:risk:three-d-secure:braintree');

export default class BraintreeStrategy extends ThreeDSecureStrategy {
  static strategyName = 'braintree_blue';

  loadBraintreeLibraries () {
    return BraintreeLoader.loadModules('threeDSecure');
  }

  static preflight ({ recurly, number, month, year, cvv }) {
    const { enabled, gatewayCode } = recurly.config.risk.threeDSecure.proactive;

    debug('performing preflight for', { gatewayCode });

    if (!enabled) {
      return Promise.resolve();
    }

    const data = {
      gateway_type: BraintreeStrategy.strategyName,
      gateway_code: gatewayCode,
      number,
      month,
      year,
      cvv
    };

    // we don't really need to do anything once we get a response except
    // resolve with relevant data instead of session_id
    return recurly.request.post({ route: '/risk/authentications', data })
      .then(({ paymentMethodNonce, clientToken, bin }) => ({
        payment_method_nonce: paymentMethodNonce,
        client_token: clientToken,
        bin,
      }));
  } 


  constructor (...args) {
    super(...args);

    this.loadBraintreeLibraries()
      .catch(cause => this.threeDSecure.error('3ds-vendor-load-error', { vendor: 'Braintree', cause }))
      .then(() => {
        this.braintree = window.braintree;
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
    return this.actionToken.transaction?.amount || this.actionToken.three_d_secure.amount;
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
}
