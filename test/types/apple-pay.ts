import { ApplePayPaymentRequest, ApplePayLineItem } from 'lib/apple-pay/native';

export default function applePay() {
  const applePaySimple = recurly.ApplePay({
    country: 'US',
    currency: 'USD',
    label: 'My Subscription',
    total: '29.00',
    pricing: window.recurly.Pricing.Checkout()
  });

  const total: ApplePayLineItem = {
    label: 'My Subscription',
    paymentTiming: 'recurring',
    amount: '29.00',
    recurringPaymentIntervalUnit: 'month',
    recurringPaymentIntervalCount: 1,
    recurringPaymentStartDate: new Date(),
  };

  const paymentRequest: ApplePayPaymentRequest = {
    total,
    lineItems: [{ label: 'Subtotal', amount: '1.00' }],
    requiredShippingContactFields: ['email', 'phone'],
    billingContact: {
      givenName: 'Emmet',
      familyName: 'Brown',
      addressLines: ['1640 Riverside Drive', 'Suite 1'],
      locality: 'Hill Valley',
      administrativeArea: 'CA',
      postalCode: '91103',
      countryCode: 'US'
    },
    shippingContact: {
      phoneNumber: '1231231234',
      emailAddress: 'ebrown@example.com'
    },
    recurringPaymentRequest: {
      paymentDescription: 'A recurring subscription',
      regularBilling: total,
      billingAgreement: 'Will recur forever',
    },
  };

  const applePay = recurly.ApplePay({
    country: 'US',
    currency: 'USD',
    paymentRequest,
  });

  applePay.ready(() => {});
  // @ts-expect-error
  applePay.ready(arg => {});

  applePay.begin(() => {});
  // @ts-expect-error
  applePay.begin(arg => {});

  applePay.on('error', () => {});
  applePay.on('token', () => {});
  // @ts-expect-error
  applePay.on('fake-event', () => {});
}
