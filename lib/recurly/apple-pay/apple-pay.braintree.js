import Promise from 'promise';
import { ApplePay } from './apple-pay';
import loadScriptPromise from '../../util/load-script-promise';
import Debug from 'debug';

const debug = Debug('recurly:apple-pay:braintree');

const CLIENT_VERSION = '3.76.0';
const LIBS = {
  client: 'client',
  applePay: 'apple-pay',
  dataCollector: 'data-collector',
};

const loadBraintree = (...libs) => {
  const loadLib = lib => {
    const isLibPresent = window.braintree?.client?.VERSION === CLIENT_VERSION &&
      lib in window.braintree;

    return isLibPresent
      ? Promise.resolve()
      : loadScriptPromise(ApplePayBraintree.libUrl(lib));
  };

  return loadLib('client')
    .then(() => Promise.all(libs.map(loadLib)));
};

export class ApplePayBraintree extends ApplePay {
  static libUrl (lib) {
    return `https://js.braintreegateway.com/web/${CLIENT_VERSION}/js/${LIBS[lib]}.min.js`;
  }

  configure (options) {
    debug('Initializing client');

    const authorization = options.braintree.clientAuthorization;

    loadBraintree('applePay', 'dataCollector')
      .then(() => window.braintree.client.create({ authorization }))
      .then(client => Promise.all([
        window.braintree.dataCollector.create({ client }),
        window.braintree.applePay.create({ client })
      ]))
      .then(([dataCollector, applePay]) => { this.braintree = { dataCollector, applePay }; })
      .catch(err => {
        this.initError = this.error('apple-pay-init-error', { err });
        return Promise.reject(this.initError);
      })
      .then(() => super.configure(options));
  }

  onValidateMerchant (event) {
    debug('Validating merchant session', event);

    this.braintree.applePay
      .performValidation({ validationURL: event.validationURL, displayName: 'My Store' })
      .then(merchantSession => this.session.completeMerchantValidation(merchantSession))
      .catch(err => this.error(err));
  }

  token (event) {
    debug('Creating token');

    this.braintree.applePay
      .tokenize({ token: event.payment.token })
      .then(braintreeToken => {
        event.payment.gatewayToken = braintreeToken;
        return super.token(event);
      })
      .catch(err => this.error('apple-pay-payment-failure', err));
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

  onCancel (event) {
    debug('Teardown payment', event);

    this.braintree.applePay
      .teardown()
      .finally(() => super.onCancel(event));
  }
}
