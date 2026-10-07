import { GooglePay } from './google-pay';
import { GooglePayBraintree } from './google-pay.braintree';
import { FORM_BILLING_CONTACT, WALLET_BILLING_CONTACT } from '../billing-contact-selection';

/**
 * Returns a GooglePay instance.
 *
 * @param  {Object} options
 * @return {GooglePay}
 */
export function factory (options) {
  const factoryClass = options?.braintree?.clientAuthorization
    ? GooglePayBraintree
    : GooglePay;

  return new factoryClass(Object.assign({}, options, { recurly: this }));
}

factory.FormBillingContact = FORM_BILLING_CONTACT;
factory.WalletBillingContact = WALLET_BILLING_CONTACT;
