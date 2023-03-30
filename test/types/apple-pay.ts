export default function applePay() {
  const applePayDeprecated = recurly.ApplePay({
    country: 'US',
    currency: 'USD',
    label: 'My Subscription',
    total: '29.00',
    pricing: window.recurly.Pricing.Checkout()
  });

  const applePay = recurly.ApplePay({
    country: 'US',
    currency: 'USD',
    total: { label: 'My Subscription', amount: '29.00' },
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
    pricing: window.recurly.Pricing.Checkout()
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
