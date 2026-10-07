import { ApplePay } from './apple-pay';
import { ApplePayBraintree } from './apple-pay.braintree';
import { FORM_BILLING_CONTACT, WALLET_BILLING_CONTACT } from '../billing-contact-selection';

/**
 * Instantiation factory
 *
 * @param  {Object} options
 * @return {ApplePay}
 */
export function factory (options) {
  const factoryClass = options?.braintree?.clientAuthorization
    ? ApplePayBraintree
    : ApplePay;

  return new factoryClass(Object.assign({}, options, { recurly: this }));
}

factory.FormBillingContact = FORM_BILLING_CONTACT;
factory.WalletBillingContact = WALLET_BILLING_CONTACT;
