import Emitter from 'component-emitter';
import { loadLibs } from '../../util/dom';
import recurlyError from '../errors';

const GOOGLE_PAY_LIB_URL = 'https://pay.google.com/gp/p/js/pay.js';

const loadGooglePayLib = () => Promise.resolve(
  window.google?.payments?.api?.PaymentsClient || loadLibs(GOOGLE_PAY_LIB_URL)
);

const payWithGoogle = ({
  googlePayInfo: {
    environment,
    googlePayConfig,
    paymentDataRequest,
  },
  options: {
    buttonOptions,
  },
}) => {
  let googlePayClient;
  const paymentDataEmitter = new Emitter();

  const onGooglePayButtonClicked = () => googlePayClient.loadPaymentData(paymentDataRequest)
    .then(paymentData => paymentDataEmitter.emit('payment-data', paymentData))
    .catch(err => paymentDataEmitter.emit('error', recurlyError('google-pay-payment-failure', { err })));

  return loadGooglePayLib()
    .then(() => {
      googlePayClient = new window.google.payments.api.PaymentsClient({ environment });
      return googlePayClient.isReadyToPay(googlePayConfig);
    })
    .catch(err => {
      throw recurlyError('google-pay-init-error', { err });
    })
    .then(({ result: isReadyToPay }) => {
      if (!isReadyToPay) {
        throw recurlyError('google-pay-not-available');
      }
    })
    .then(() => googlePayClient.createButton({
      ...buttonOptions,
      onClick: onGooglePayButtonClicked
    }))
    .then($button => ({
      $button,
      paymentDataEmitter,
    }));
};

export { payWithGoogle };
