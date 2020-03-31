import Emitter from './emitter';
import { TokenHandler } from './token';

type BraintreeConfig = {
  braintree: {
    clientAuthorization: string;
  };
};

type DirectConfig = {
  display?: {
    displayName?: string;
  };
};

type PayPalConfig = BraintreeConfig | DirectConfig;

type PayPalEvent = 'error' | 'token';

interface PayPalInstance extends Emitter<PayPalEvent> {
  start: VoidFunction;
  token: TokenHandler;
}

type PayPal = (config?: PayPalConfig) => PayPalInstance;

export default PayPal;
