import Emitter from 'component-emitter';
import Promise from 'promise';
import { normalize } from '../../util/normalize';
import { FIELDS as TOKEN_FIELDS } from '../token';
import recurlyError from '../errors';
import { payWithGoogle } from './pay-with-google';

const debug = require('debug')('recurly:google-pay');

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

const validateRecurlyMerchantInfo = ({ recurlyMerchantInfo }) => {
  if (recurlyMerchantInfo.paymentMethods.length === 0) {
    throw recurlyError('google-pay-not-configured');
  }

  return recurlyMerchantInfo;
};

const buildIsReadyToPayRequest = (paymentMethods, { billingAddressRequired }) => {
  return {
    ...API_VERSION,
    allowedPaymentMethods: paymentMethods.map(({ cardNetworks, authMethods, paymentGateway, direct }) => ({
      type: 'CARD',
      parameters: {
        allowedCardNetworks: cardNetworks,
        allowedAuthMethods: authMethods,
        ...(billingAddressRequired && {
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
};

const getGoogleInfoFromMerchantInfo = ({ recurlyMerchantInfo, options }) => {
  const { siteMode, paymentMethods } = recurlyMerchantInfo;
  const { environment: envOpt, } = options;
  const environment = envOpt || (siteMode === 'production' ? 'PRODUCTION' : 'TEST');

  const gatewayCode = paymentMethods.filter(({ gatewayCode }) => gatewayCode)[0]?.gatewayCode;
  const isReadyToPayRequest = buildIsReadyToPayRequest(paymentMethods, {
    billingAddressRequired: options.billingAddressRequired ?? options.requireBillingAddress,
  });

  const {
    googleMerchantId: merchantId,
    googleBusinessName: merchantName,
    country: countryCode,
    currency: currencyCode,
    total: totalPrice,
  } = options;

  const paymentDataRequest = {
    ...isReadyToPayRequest,
    ...options.paymentDataRequest,
    merchantInfo: {
      merchantId,
      merchantName,
      ...options.paymentDataRequest?.merchantInfo,
    },
    transactionInfo: {
      currencyCode,
      countryCode,
      totalPrice,
      totalPriceStatus: 'FINAL', // only when the price will nto change
      ...options.paymentDataRequest?.transactionInfo,
    },
  };

  return { gatewayCode, environment, isReadyToPayRequest, paymentDataRequest };
};

const buildPaymentDataRequest = ({ recurly, options }) => {
  return new Promise((resolve, reject) => {
    const data = {
      gateway_code: options.gatewayCode,
      currency: options.currency ?? options.paymentDataRequest?.transactionInfo.currencyCode,
      country: options.country ?? options.paymentDataRequest?.transactionInfo.countryCode,
    };

    if (!data.currency) return reject(recurlyError('google-pay-config-missing', { opt: 'currency' }));
    if (!data.country) return reject(recurlyError('google-pay-config-missing', { opt: 'country' }));

    resolve(data);
  }).then(data => recurly.request.get({ route: '/google_pay/info', data }))
    .then(recurlyMerchantInfo => validateRecurlyMerchantInfo({ recurlyMerchantInfo, options }))
    .then(recurlyMerchantInfo => getGoogleInfoFromMerchantInfo({ recurlyMerchantInfo, options }));
};

const googlePay = (recurly, options) => {
  const emitter = new Emitter();
  const handleErr = err => emitter.emit('error', err);
  let gatewayCodeSelected;

  const onPaymentAuthorized = (paymentData) => {
    return createRecurlyToken({ recurly, paymentData, gatewayCodeSelected, $form: options.form })
      .catch(err => {
        handleErr(recurlyError('google-pay-payment-failure', err));
        throw err;
      })
      .then(token => {
        emitter.emit('token', token, paymentData);

        paymentData.recurlyToken = token;
        debug('GooglePay.onPaymentAuthorized', paymentData);
        emitter.emit('paymentAuthorized', paymentData);
        return paymentData;
      });
  };

  buildPaymentDataRequest({ recurly, options })
    .then(({ gatewayCode, environment, isReadyToPayRequest, paymentDataRequest }) => {
      gatewayCodeSelected = gatewayCode;

      return payWithGoogle({
        paymentOptions: {
          environment,
          merchantInfo: paymentDataRequest.merchantInfo,
          paymentDataCallbacks: options.callbacks,
        },
        isReadyToPayRequest,
        paymentDataRequest,
        buttonOptions: {
          ...options.buttonOptions,
          onClick: onPaymentAuthorized,
          onError: (err) => handleErr(recurlyError('google-pay-payment-failure', err)),
        },
      });
    })
    .then(button => emitter.emit('ready', button))
    .catch(handleErr);

  return emitter;
};

export { googlePay };
