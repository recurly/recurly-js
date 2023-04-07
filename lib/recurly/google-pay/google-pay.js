import Emitter from 'component-emitter';
import { normalize } from '../../util/normalize';
import { FIELDS as TOKEN_FIELDS } from '../token';
import recurlyError from '../errors';
import { payWithGoogle } from './pay-with-google';

const API_VERSION = { apiVersion: 2, apiVersionMinor: 0 };

const getRecurlyInputsFromHtmlForm = ({ $form, inputNames }) => $form ? normalize($form, inputNames, { parseCard: false }).values : {};

const getBillingAddressFromGoogle = ({ paymentData }) => {
  const googleBillingAddress = paymentData?.paymentMethodData?.info?.billingAddress || {};
  const {
    name,
    address1,
    address2,
    countryCode,
    postalCode,
    locality,
    administrativeArea,
  } = googleBillingAddress;

  const fullNameSplitted = (name || '').trim().split(' ');
  const firstName = fullNameSplitted[0];
  const lastName = fullNameSplitted.slice(1).join(' ');

  return {
    first_name: firstName,
    last_name: lastName,
    address1,
    address2,
    city: locality,
    state: administrativeArea,
    postal_code: postalCode,
    country: countryCode,
  };
};

const createRecurlyToken = ({ recurly, $form, paymentData, gatewayCodeSelected }) => {
  const userInputs = getRecurlyInputsFromHtmlForm({ $form, inputNames: TOKEN_FIELDS });
  const userBillingAddress = getBillingAddressFromGoogle({ paymentData });
  const userInputsOverrideBillingAddress = Object.keys(userInputs).some(k => k in userBillingAddress);

  const data = {
    gateway_code: gatewayCodeSelected,
    ...userInputs,
    ...(!userInputsOverrideBillingAddress && userBillingAddress),
    paymentData,
  };

  return recurly.request.post({ route: '/google_pay/token', data });
};

const validateGooglePayOptions = options => {
  const requiredKeys = ['googleMerchantId', 'total', 'country', 'currency'];
  requiredKeys.forEach(key => {
    if (options[key] === undefined) {
      throw recurlyError('google-pay-config-missing', { opt: key });
    }
  });

  return options;
};

const validateRecurlyMerchantInfo = ({ recurlyMerchantInfo }) => {
  if (recurlyMerchantInfo.paymentMethods.length === 0) {
    throw recurlyError('google-pay-not-configured');
  }

  return recurlyMerchantInfo;
};

const getGoogleInfoFromMerchantInfo = ({ recurlyMerchantInfo, options }) => {
  const { siteMode, paymentMethods } = recurlyMerchantInfo;
  const { environment: envOpt, } = options;

  const gatewayCode = paymentMethods.filter(({ gatewayCode }) => gatewayCode)[0]?.gatewayCode;
  const environment = envOpt || (siteMode === 'production' ? 'PRODUCTION' : 'TEST');
  const isReadyToPayRequest = {
    ...API_VERSION,
    allowedPaymentMethods: paymentMethods.map(({ cardNetworks, authMethods, paymentGateway, direct }) => ({
      type: 'CARD',
      parameters: {
        allowedCardNetworks: cardNetworks,
        allowedAuthMethods: authMethods,
        billingAddressRequired: true,
        billingAddressParameters: {
          format: 'FULL',
        },
      },
      tokenizationSpecification: {
        ...(paymentGateway && {
          type: 'PAYMENT_GATEWAY',
          parameters: paymentGateway,
        }),
        ...(direct && {
          type: 'DIRECT',
          parameters: direct,
        }),
      },
    })),
  };

  const {
    googleMerchantId: merchantId,
    googleBusinessName: merchantName,
    country: countryCode,
    currency: currencyCode,
    total: totalPrice,
  } = options;
  const merchantInfo = options.merchantInfo ?? { merchantId, merchantName };
  const paymentDataRequest = {
    ...isReadyToPayRequest,
    merchantInfo,
    transactionInfo: {
      totalPriceStatus: 'FINAL', // only when the price will nto change
      totalPrice,
      currencyCode,
      countryCode,
    },
  };

  return { gatewayCode, environment, isReadyToPayRequest, paymentDataRequest };
};

const buildPaymentDataRequest = ({ recurly, options }) => {
  const { country, currency, gatewayCode } = options;
  const data = { country, currency, gateway_code: gatewayCode };

  return new Promise((resolve, reject) => {
    try {
      validateGooglePayOptions(options);
      resolve();
    } catch (err) {
      reject(err);
    }
  }).then(() => recurly.request.get({ route: '/google_pay/info', data }))
    .then(recurlyMerchantInfo => validateRecurlyMerchantInfo({ recurlyMerchantInfo, options }))
    .then(recurlyMerchantInfo => getGoogleInfoFromMerchantInfo({ recurlyMerchantInfo, options }));
};

const googlePay = (recurly, options) => {
  const emitter = new Emitter();
  const handleErr = err => emitter.emit('error', err);
  let gatewayCodeSelected;

  const onGooglePayButtonClicked = (err, paymentData) => {
    if (err) {
      return handleErr(recurlyError('google-pay-payment-failure', err));
    }

    createRecurlyToken({ recurly, paymentData, gatewayCodeSelected, $form: options.form })
      .then(token => emitter.emit('token', token, paymentData))
      .catch(handleErr);
  };

  buildPaymentDataRequest({ recurly, options })
    .then(({ gatewayCode, environment, isReadyToPayRequest, paymentDataRequest }) => {
      gatewayCodeSelected = gatewayCode;

      return payWithGoogle({
        environment,
        isReadyToPayRequest,
        paymentDataRequest,
        buttonOptions: {
          ...options.buttonOptions,
          onClick: onGooglePayButtonClicked,
        },
      });
    })
    .then(button => emitter.emit('ready', button))
    .catch(handleErr);

  return emitter;
};

export { googlePay };
