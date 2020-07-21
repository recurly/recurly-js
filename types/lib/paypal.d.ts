import { Emitter } from './emitter';

export type BraintreeConfig = {
  braintree: {
    clientAuthorization: string;
  };
};

export type DirectConfig = {
  display?: {
    displayName?: string;
  };
};

export type PayPalConfig = BraintreeConfig | DirectConfig;

export type PayPalEvent = 'error' | 'token';

export type PayPalStartOptions = {
  options: {
    description: string;
  }
};

export interface PayPalInstance extends Emitter<PayPalEvent> {
  start: (payPalStartOptions?: PayPalStartOptions) => void;
  destroy: VoidFunction;
}

export type PayPal = (config?: PayPalConfig) => PayPalInstance;
