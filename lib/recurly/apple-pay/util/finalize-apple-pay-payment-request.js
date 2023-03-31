import { normalize } from '../../../util/normalize';
import { ADDRESS_FIELDS } from '../../token';
import { transformAddress, BILLING_CONTACT_MAP } from './transform-address';

/**
 * builds the billingContact from either the pricing address or an address object
 *
 * @param {Pricing} pricing
 * @param {object} address address fields
 * @return {object} billingContact
 * @private
 */
function buildBillingContact (pricing, address) {
  address = pricing?.items.address ?? address;
  if (address) return transformAddress(address, { map: BILLING_CONTACT_MAP });
}

/**
 * builds the shipping from either the pricing shipping address or an address object.
 * includes the pricing address phone number if present.
 *
 * @param {Pricing} pricing
 * @param {object} address address fields
 * @return {object} shippingContact
 * @private
 */
function buildShippingContact (pricing, address) {
  const phone = pricing?.items.address?.phone;
  address = phone || pricing?.items.shippingAddress
    ? { phone, ...pricing.items.shippingAddress }
    : address;

  if (address) return transformAddress(address);
}

/**
 * builds an ApplePaySession with the billing and shipping contact's from the config
 *
 * @param {number} version Apple Pay on the Web version
 * @param {object} paymentRequest the ApplePayPaymentRequest object
 * @param {object} config the ApplePay config
 * @return {object} ApplePaySession
 * @private
 */
export default function finalizeApplePayPaymentRequest (paymentRequest, config) {
  if (paymentRequest.billingContact && paymentRequest.shippingContact) return paymentRequest;

  const formAddress = config.form
    ? normalize(config.form, ADDRESS_FIELDS, { parseCard: false }).values
    : null;
  const formPhone = formAddress?.phone ? { phone: formAddress.phone } : null;

  const billingContact = paymentRequest.billingContact ?? buildBillingContact(config.pricing, formAddress);
  const shippingContact = paymentRequest.shippingContact ?? buildShippingContact(config.pricing, formPhone);

  return {
    ...paymentRequest,
    ...(billingContact && { billingContact }),
    ...(shippingContact && { shippingContact }),
  };
}
