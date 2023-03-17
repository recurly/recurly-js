import AlternativePaymentMethods from './alternative-payment-methods';

export function factory (options) {
  const recurly = this;

  return new AlternativePaymentMethods(recurly, options);
}
