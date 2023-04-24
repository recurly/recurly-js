import PayPalCommerce from './paypal-commerce';

export function factory (options) {
  const recurly = this;

  return new PayPalCommerce(recurly, options);
}
