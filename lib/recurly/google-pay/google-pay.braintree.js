import Promise from 'promise';
import { GooglePay } from './google-pay';
import Debug from 'debug';
import BraintreeLoader from '../../util/braintree-loader';
import errors from '../errors';
import { payWithGoogle } from './pay-with-google';

const debug = Debug('recurly:google-pay:braintree');

export class GooglePayBraintree extends GooglePay {
  configure (options) {
    debug('Initializing client');

    const authorization = options.braintree.clientAuthorization;

    BraintreeLoader.loadModules('googlePayment', 'dataCollector')
      .then(() => window.braintree.client.create({ authorization }))
      .then(client => Promise.all([
        window.braintree.dataCollector.create({ client }),
        window.braintree.googlePayment.create({
          client,
          googlePayVersion: 2,
          googleMerchantId: options.googleMerchantId,
        })
      ]))
      .then(([dataCollector, googlePayment]) => { this.braintree = { dataCollector, googlePayment }; })
      .catch(err => this.emit('error', errors('google-pay-init-error', { err })))
      .then(() => super.configure(options));
  }

  createButton ({ paymentOptions, isReadyToPayRequest, paymentDataRequest: recurlyPaymentDataRequest, buttonOptions }) {
    // allow Braintree to set the tokenizationSpecification for its gateway
    recurlyPaymentDataRequest.allowedPaymentMethods.forEach(method => {
      if (method.tokenizationSpecification) delete method.tokenizationSpecification;
    });
    const paymentDataRequest = this.braintree.googlePayment.createPaymentDataRequest(recurlyPaymentDataRequest);
    debug('Creating button', recurlyPaymentDataRequest, paymentDataRequest);
    return payWithGoogle({
      paymentOptions,
      isReadyToPayRequest,
      paymentDataRequest,
      buttonOptions,
    });
  }

  token (paymentData) {
    debug('Creating token', paymentData);

    return this.braintree.googlePayment
      .parseResponse(paymentData)
      .then(token => {
        token.deviceData = this.braintree.dataCollector.deviceData;
        paymentData.paymentMethodData.gatewayToken = token;
        return super.token(paymentData);
      });
  }

  mapPaymentData (paymentData) {
    return {
      type: 'braintree',
      ...super.mapPaymentData(paymentData),
    };
  }
}
