import Emitter from 'component-emitter';
import Promise from 'promise';
import { normalize } from '../../util/normalize';
import { FIELDS as TOKEN_FIELDS } from '../token';
import errors from '../errors';
import { payWithGoogle } from './pay-with-google';

const debug = require('debug')('recurly:google-pay');

const API_VERSION = { apiVersion: 2, apiVersionMinor: 0 };

const transformAddress = ({ paymentData }) => {
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

const validateRecurlyMerchantInfo = (recurlyMerchantInfo) => {
  if (recurlyMerchantInfo.paymentMethods.length === 0) {
    throw errors('google-pay-not-configured');
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

const getGoogleInfoFromMerchantInfo = (recurlyMerchantInfo, options) => {
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

  return {
    gatewayCode,
    environment,
    isReadyToPayRequest: {
      ...isReadyToPayRequest,
      ...(options.existingPaymentMethodRequired === true && { existingPaymentMethodRequired: true }),
    },
    paymentDataRequest,
  };
};

const buildPaymentDataRequest = (googlePay, options) => {
  const { recurly } = googlePay;
  return new Promise((resolve, reject) => {
    const data = {
      gateway_code: options.gatewayCode,
      currency: options.currency ?? options.paymentDataRequest?.transactionInfo.currencyCode,
      country: options.country ?? options.paymentDataRequest?.transactionInfo.countryCode,
    };

    if (!data.currency) return reject(errors('google-pay-config-missing', { opt: 'currency' }));
    if (!data.country) return reject(errors('google-pay-config-missing', { opt: 'country' }));

    resolve(data);
  }).then(data => recurly.request.get({ route: '/google_pay/info', data }))
    .then(recurlyMerchantInfo => validateRecurlyMerchantInfo(recurlyMerchantInfo))
    .then(recurlyMerchantInfo => getGoogleInfoFromMerchantInfo(recurlyMerchantInfo, options));
};

export class GooglePay extends Emitter {
  constructor (options) {
    super();

    this._ready = false;
    this.config = {};
    this.options = options;
    this.once('ready', () => this._ready = true);

    this.configure({ ...options });
  }

  /**
   * Initialized state callback registry
   *
   * @param  {Function} cb callback
   * @public
   */
  ready (cb) {
    if (this._ready) cb();
    else this.once('ready', cb);
  }

  /**
   * Configures a new instance
   *
   * @param  {Object} options
   * @emit 'ready'
   * @private
   */
  configure (options) {
    if (options.recurly) this.recurly = options.recurly;
    else throw errors('google-pay-factory-only');

    if (options.form) this.config.form = options.form;
    if (options.callbacks) this.config.callbacks = options.callbacks;

    return buildPaymentDataRequest(this, options)
      .then(({ gatewayCode, environment, isReadyToPayRequest, paymentDataRequest }) => {
        this.config.gatewayCode = gatewayCode;

        return this.createButton({
          paymentOptions: {
            environment,
            merchantInfo: paymentDataRequest.merchantInfo,
            paymentDataCallbacks: this.config.callbacks,
          },
          isReadyToPayRequest,
          paymentDataRequest,
          buttonOptions: {
            ...options.buttonOptions,
            onClick: this.token.bind(this),
            onError: (err) => this.emit('error', errors('google-pay-payment-failure', err)),
          },
        });
      })
      .then(button => this.emit('ready', button))
      .catch(err => this.emit('error', err));
  }

  /**
   * Creates the Google Pay button that will trigger the payment flow
   *
   * @public
   */
  createButton (payWithGoogleRequest) {
    return payWithGoogle(payWithGoogleRequest);
  }

  isBnplPayment (paymentData) {
    const pm = paymentData?.paymentMethodData;
    const description = (pm?.description || '').toLowerCase();
    const cardDetails = (pm?.info?.cardDetails || '').toLowerCase();
    const BNPL_KEYWORDS = ['affirm', 'klarna', 'afterpay'];

    return BNPL_KEYWORDS.some(k => description.includes(k) || cardDetails.includes(k));
  }

  token (paymentData) {
    if (this.isBnplPayment(paymentData)) {
      const err = errors('google-pay-bnpl-not-supported');
      debug('bnpl blocked before tokenization', { reason: err.code, paymentMethodData: paymentData?.paymentMethodData });
      this.emit('error', err);
      return Promise.reject(err);
    }

    const data = this.mapPaymentData(paymentData);
    debug('paymentData received', paymentData);

    return this.recurly.request.post({ route: '/google_pay/token', data })
      .catch(err => {
        debug('tokenization error', err);
        throw err;
      })
      .then(token => {
        debug('Token received', token);
        this.emit('token', token, paymentData);

        paymentData.recurlyToken = token;
        debug('onPaymentAuthorized', paymentData);
        this.emit('paymentAuthorized', paymentData);

        return paymentData;
      });
  }

  mapPaymentData (paymentData) {
    const formAddress = this.config.form ? normalize(this.config.form, TOKEN_FIELDS, { parseCard: false }).values : {};
    const googleBillingAddress = transformAddress({ paymentData });
    const useGoogleAddress = Object.keys(formAddress).some(k => k in googleBillingAddress);

    return {
      gateway_code: this.config.gatewayCode,
      ...formAddress,
      ...(!useGoogleAddress && googleBillingAddress),
      paymentData,
    };
  }
}
