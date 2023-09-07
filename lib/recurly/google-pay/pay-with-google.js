import Promise from 'promise';
import { loadLibs } from '../../util/dom';
import recurlyError from '../errors';

const GOOGLE_PAY_LIB_URL = 'https://pay.google.com/gp/p/js/pay.js';

const debug = require('debug')('recurly:google-pay');

const loadGooglePayLib = () => Promise.resolve(
  window.google?.payments?.api?.PaymentsClient || loadLibs(GOOGLE_PAY_LIB_URL)
);

function createButton (
  googlePayClient,
  paymentDataRequest,
  {
    onClick,
    onError,
    ...buttonOptions
  },
) {
  const { allowedPaymentMethods, transactionInfo } = paymentDataRequest;

  googlePayClient.prefetchPaymentData({
    ...paymentDataRequest,
    transactionInfo: {
      ...transactionInfo,
      totalPriceStatus: 'NOT_CURRENTLY_KNOWN',
    },
  });

  debug('GooglePay.createButton', paymentDataRequest, buttonOptions);
  return googlePayClient.createButton({
    ...buttonOptions,
    allowedPaymentMethods,
    onClick: () => googlePayClient.loadPaymentData(paymentDataRequest).then(onClick).catch(onError),
  });
}

const payWithGoogle = ({ paymentOptions, isReadyToPayRequest, paymentDataRequest, buttonOptions }) => {
  const { paymentDataCallbacks } = paymentOptions;

  if (paymentDataCallbacks) {
    const { onPaymentAuthorized, onPaymentDataChanged } = paymentDataCallbacks;
    const callbackIntents = paymentDataRequest.callbackIntents = [];

    if (onPaymentAuthorized) {
      const { onClick } = buttonOptions;
      delete buttonOptions.onClick;
      paymentDataCallbacks.onPaymentAuthorized = (paymentData) => {
        return onClick(paymentData)
          .catch(() => Promise.reject({
            reason: 'OTHER_ERROR',
            message: 'Error processing payment information, please try again later',
            intent: 'PAYMENT_AUTHORIZATION'
          }))
          .then(onPaymentAuthorized)
          .then(({ error } = {}) => error ? Promise.reject(error) : { transactionState: 'SUCCESS' })
          .catch(error => ({ transactionState: 'ERROR', error }));
      };
      callbackIntents.push('PAYMENT_AUTHORIZATION');
    }

    if (onPaymentDataChanged && paymentDataRequest.shippingAddressRequired) callbackIntents.push('SHIPPING_ADDRESS');
    if (onPaymentDataChanged && paymentDataRequest.shippingOptionRequired) callbackIntents.push('SHIPPING_OPTION');
  }

  let googlePayClient;
  return loadGooglePayLib()
    .then(() => {
      debug('GooglePay.newPaymentsClient', paymentOptions);
      googlePayClient = new window.google.payments.api.PaymentsClient(paymentOptions);

      debug('GooglePay.isReadyToPay', isReadyToPayRequest);
      return googlePayClient.isReadyToPay(isReadyToPayRequest);
    })
    .catch(err => {
      throw recurlyError('google-pay-init-error', { err });
    })
    .then(({ result: isReadyToPay, paymentMethodPresent }) => {
      if (!isReadyToPay || paymentMethodPresent === false) {
        throw recurlyError('google-pay-not-available');
      }

      return createButton(googlePayClient, paymentDataRequest, buttonOptions);
    });
};

export { payWithGoogle };
