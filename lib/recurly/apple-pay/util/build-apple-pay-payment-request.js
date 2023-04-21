import intersection from 'intersect';
import errors from '../../errors';
import filterSupportedNetworks from './filter-supported-networks';
import { lineItem } from './apple-pay-line-item';

const REQUIRED_SHIPPING_FIELDS_VERSION = 6;

function buildOrder (config, options, paymentRequest) {
  let { total: totalLineItem } = paymentRequest;
  if (!totalLineItem) {
    const { recurring, total } = options;
    paymentRequest.total = totalLineItem = lineItem(config.i18n.totalLineItemLabel, total, { recurring });
  }

  if (!paymentRequest.recurringPaymentRequest && totalLineItem.paymentTiming === 'recurring') {
    paymentRequest.recurringPaymentRequest = {
      paymentDescription: totalLineItem.label,
      regularBilling: totalLineItem,
    };
  }
}

/**
 * @callback requestCallback
 * @param {Error} err
 * @param {Object} ApplePayPaymentRequest
 */
/**
 * Build the ApplePayPaymentRequest from the ApplePay options
 *
 * @param {Object} applePay instance of recurly.ApplePay
 * @param {Object} options recurly.ApplePay options
 * @param {requestCallback} cb callback that handles the payment request
 * @private
 */
export default function buildApplePayPaymentRequest (applePay, options, cb) {
  const { recurly, config } = applePay;
  const paymentRequest = {
    currencyCode: options.currency,
    countryCode: options.country,
    requiredShippingContactFields: options.requiredShippingContactFields, // deprecated
    ...options.paymentRequest,
    requiredBillingContactFields: ['postalAddress'],
  };

  if (!paymentRequest.currencyCode) return cb(errors('apple-pay-config-missing', { opt: 'currency' }));
  if (!paymentRequest.countryCode) return cb(errors('apple-pay-config-missing', { opt: 'country' }));

  // The order is handled by pricing if set
  if (!config.pricing) {
    const error = buildOrder(config, options, paymentRequest);
    if (error) return cb(error);
  }

  if (options.enforceVersion &&
      paymentRequest.requiredShippingContactFields &&
      !window.ApplePaySession.supportsVersion(REQUIRED_SHIPPING_FIELDS_VERSION)) return cb(errors('apple-pay-not-supported'));

  recurly.request.get({
    route: '/apple_pay/info',
    data: {
      currency: paymentRequest.currencyCode,
      country: paymentRequest.countryCode,
      host: window.location.hostname,
    },
    done: applyRemoteConfig(paymentRequest, cb)
  });
}

/**
 * Adds merchant site specific config to the payment request
 * @param  {object} options
 * @param {requestCallback} cb callback that handles the payment request
 * @private
 */
function applyRemoteConfig (paymentRequest, cb) {
  return (err, info) => {
    if (err) return cb(err);

    if ('countries' in info && !~info.countries.indexOf(paymentRequest.countryCode)) {
      return cb(errors('apple-pay-config-invalid', { opt: 'country', set: info.countries }));
    }

    if ('currencies' in info && !~info.currencies.indexOf(paymentRequest.currencyCode)) {
      return cb(errors('apple-pay-config-invalid', { opt: 'currency', set: info.currencies }));
    }

    if ('subdomain' in info) paymentRequest.applicationData = btoa(info.subdomain);

    paymentRequest.merchantCapabilities = info.merchantCapabilities || [];
    const supportedNetworks = paymentRequest.supportedNetworks
      ? intersection(info.supportedNetworks, paymentRequest.supportedNetworks)
      : info.supportedNetworks;
    paymentRequest.supportedNetworks = filterSupportedNetworks(supportedNetworks);

    const { recurringPaymentRequest } = paymentRequest;
    if (recurringPaymentRequest) {
      if (!recurringPaymentRequest.managementURL && !info.managementURL) {
        return cb(errors('apple-pay-config-invalid', { opt: 'recurringPaymentRequest.managementURL' }));
      } else if (!recurringPaymentRequest.managementURL) {
        recurringPaymentRequest.managementURL = info.managementURL;
      }
    }

    cb(null, paymentRequest);
  };
}
