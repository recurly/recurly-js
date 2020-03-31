import Emitter from './emitter';
import { CheckoutPricingInstance } from './pricing/checkout';

type ApplePayConfig = {
  country: string;
  currency: string;
  label: string;
  total: string;
  pricing?: CheckoutPricingInstance;
  form?: HTMLFormElement;
};

type ApplePayEvent =
  | 'token'
  | 'error'
  | 'ready'
  | 'shippingContactSelected'
  | 'paymentAuthorized'
  | 'shippingMethodSelected'
  | 'cancel';

interface ApplePayInstance extends Emitter<ApplePayEvent> {
  ready: (cb?: VoidFunction) => void;
  begin: (cb?: VoidFunction) => void;
}

type ApplePay = (config: ApplePayConfig) => ApplePayInstance;

export default ApplePay;
