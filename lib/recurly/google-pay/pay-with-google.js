import { loadLibs } from '../../util/dom';
import recurlyError from '../errors';

const GOOGLE_PAY_LIB_URL = 'https://pay.google.com/gp/p/js/pay.js';

const loadGooglePayLib = () => Promise.resolve(
  window.google?.payments.api.PaymentsClient || loadLibs(GOOGLE_PAY_LIB_URL)
);

function createButton (
  googlePayClient,
  paymentDataRequest,
  {
    onClick: onButtonClick,
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

  return googlePayClient.createButton({
    ...buttonOptions,
    allowedPaymentMethods,
    onClick: () => {
      googlePayClient
        .loadPaymentData(paymentDataRequest)
        .catch(onButtonClick)
        .then(paymentData => onButtonClick?.(null, paymentData));
    },
  });
}

const payWithGoogle = ({
  environment,
  isReadyToPayRequest,
  paymentDataRequest,
  buttonOptions,
}) => {
  let googlePayClient;

  return loadGooglePayLib()
    .then(() => {
      googlePayClient = new window.google.payments.api.PaymentsClient({ environment });
      return googlePayClient.isReadyToPay(isReadyToPayRequest);
    })
    .catch(err => {
      throw recurlyError('google-pay-init-error', { err });
    })
    .then(({ result: isReadyToPay }) => {
      if (!isReadyToPay) {
        throw recurlyError('google-pay-not-available');
      }

      return createButton(googlePayClient, paymentDataRequest, buttonOptions);
    });
};

export { payWithGoogle };
