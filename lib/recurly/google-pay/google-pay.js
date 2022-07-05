import Emitter from 'component-emitter';
import { normalize } from '../../util/normalize';
import { FIELDS as TOKEN_FIELDS } from '../token';
import recurlyError from '../errors';
import { payWithGoogle } from './pay-with-google';

const getRecurlyInputsFromHtmlForm = ({ $form, inputNames }) => $form ? normalize($form, inputNames).values : {};

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
    google_pay_token: paymentData?.paymentMethodData?.tokenizationData?.token,
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
  const {
    environment: envOpt,
    googleMerchantId,
    googleBusinessName,
    total,
    country,
    currency,
    requireBillingAddress,
  } = options;

  const gatewayCodeSelected = paymentMethods.filter(({ gatewayCode }) => gatewayCode)[0]?.gatewayCode;
  const environment = envOpt || (siteMode === 'production' ? 'PRODUCTION' : 'TEST');
  const googlePayConfig = {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: paymentMethods.map(({ cardNetworks, authMethods, paymentGateway, direct }) => ({
      type: 'CARD',
      parameters: {
        allowedCardNetworks: cardNetworks,
        allowedAuthMethods: authMethods,
        ...(requireBillingAddress && {
          billingAddressRequired: true,
          billingAddressParameters: {
            format: 'FULL',
          },
        }),
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
  const paymentDataRequest = {
    ...googlePayConfig,
    merchantInfo: {
      merchantId: googleMerchantId,
      merchantName: googleBusinessName,
    },
    transactionInfo: {
      totalPriceStatus: 'FINAL', // only when the price will nto change
      totalPrice: total,
      currencyCode: currency,
      countryCode: country
    },
  };

  return { gatewayCodeSelected, environment, googlePayConfig, paymentDataRequest };
};

const getGooglePayInfo = ({ recurly, options }) => {
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

  getGooglePayInfo({ recurly, options })
    .then(googlePayInfo => {
      gatewayCodeSelected = googlePayInfo.gatewayCodeSelected;
      return payWithGoogle({ googlePayInfo, options });
    })
    .then(({ $button, paymentDataEmitter }) => emitter.emit('ready', $button) && paymentDataEmitter)
    .catch(err => {
      handleErr(err);
      throw err;
    })
    .then(paymentDataEmitter => paymentDataEmitter
      .on('payment-data', paymentData => createRecurlyToken({ recurly, paymentData, gatewayCodeSelected, $form: options.form })
        .then(token => emitter.emit('token', token))
        .catch(handleErr)
      )
      .on('error', handleErr)
    );

  return emitter;
};

export { googlePay };
