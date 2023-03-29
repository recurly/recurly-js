import errors from '../../errors';
import filterSupportedNetworks from './filter-supported-networks';
import { lineItem, isLineItem } from './apple-pay-line-item';

const REQUIRED_SHIPPING_FIELDS_VERSION = 6;

function buildOrder (config, options, paymentRequest) {
  if (!options.total) return errors('apple-pay-config-missing', { opt: 'total' });

  const { total, lineItems = [] } = options;
  ['total', 'lineItems'].forEach(k => delete options[k]);

  if (isLineItem(total)) {
    paymentRequest.total = total;
  } else if (typeof total === 'object') {
    const missing = (total.label === undefined) ? 'label' : 'amount';
    return errors('apple-pay-config-missing', { opt: `total.${missing}` });
  } else {
    paymentRequest.total = lineItem(config.i18n.totalLineItemLabel, total);
  }

  paymentRequest.lineItems = lineItems;
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

  const { currency: currencyCode, country: countryCode } = options;
  if (!currencyCode) return cb(errors('apple-pay-config-missing', { opt: 'currency' }));
  if (!countryCode) return cb(errors('apple-pay-config-missing', { opt: 'country' }));
  ['currency', 'country'].forEach(k => delete options[k]);

  let paymentRequest = {
    currencyCode,
    countryCode,
    requiredBillingContactFields: ['postalAddress'],
  };

  // The order is handled by pricing if set
  if (!config.pricing) {
    const error = buildOrder(config, options, paymentRequest);
    if (error) return cb(error);
  }

  if (options.enforceVersion &&
      options.requiredShippingContactFields &&
      !window.ApplePaySession.supportsVersion(REQUIRED_SHIPPING_FIELDS_VERSION)) return cb(errors('apple-pay-not-supported'));
  delete options.enforceVersion;

  paymentRequest = {
    ...options,
    ...paymentRequest,
  };

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
    paymentRequest.supportedNetworks = filterSupportedNetworks(info.supportedNetworks || []);

    cb(null, paymentRequest);
  };
}
