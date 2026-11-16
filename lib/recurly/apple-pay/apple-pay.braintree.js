import Promise from 'promise';
import { ApplePay } from './apple-pay';
import Debug from 'debug';
import BraintreeLoader from '../../util/braintree-loader';

const debug = Debug('recurly:apple-pay:braintree');

export class ApplePayBraintree extends ApplePay {
  configure (options) {
    debug('Initializing client');

    const authorization = options.braintree.clientAuthorization;
    if (options.braintree.displayName) this.displayName = options.braintree.displayName;
    else this.displayName = 'My Store';

    BraintreeLoader.loadModules('applePay', 'dataCollector')
      .then(() => window.braintree.client.create({ authorization }))
      .then(client => Promise.all([
        window.braintree.dataCollector.create({ client }),
        window.braintree.applePay.create({ client })
      ]))
      .then(([dataCollector, applePay]) => { this.braintree = { dataCollector, applePay }; })
      .catch(err => {
        this.initError = this.error('apple-pay-init-error', { err });
      })
      .then(() => {
        if (!this.initError) super.configure(options);
      });
  }

  onValidateMerchant (event) {
    debug('Validating merchant session', event);
    const session = this.session;

    this.braintree.applePay
      .performValidation({ validationURL: event.validationURL, displayName: this.displayName })
      .then(merchantSession => {
        if (!this.isActive(session)) return;
        session.completeMerchantValidation(merchantSession);
      })
      .catch(err => {
        if (!this.isActive(session)) return;
        this.error(err);
      });
  }

  token (event) {
    debug('Creating token');
    const session = this.session;

    this.braintree.applePay
      .tokenize({ token: event.payment.token })
      .then(braintreeToken => {
        if (!this.isActive(session)) return;
        event.payment.gatewayToken = braintreeToken;
        return super.token(event);
      })
      .catch(err => {
        if (!this.isActive(session)) return;
        session.completePayment({ status: this.session.STATUS_FAILURE });
        return this.error('apple-pay-payment-failure', err);
      });
  }

  mapPaymentData (event) {
    return {
      type: 'braintree',
      payload: {
        deviceData: this.braintree.dataCollector.deviceData,
        tokenizePayload: event.payment.gatewayToken,
        applePayPayment: super.mapPaymentData(event),
      },
    };
  }
}
