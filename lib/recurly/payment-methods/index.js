import PaymentMethods from './payment-methods';

export function factory (options) {
  const recurly = this;

  return new PaymentMethods(recurly, options);
}
