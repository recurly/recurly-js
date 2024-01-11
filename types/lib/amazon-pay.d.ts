import { Emitter } from './emitter';

export type AmazonPayOptions = {
  /**
   * 2 Digit Country Code
   */
  region: string;

  /**
   * The customer's locale. This is used to set the language rendered in the UI.
   */
  locale: string;

  /**
   * The currency of the payment.
   */
  currency: string;

  /**
   * Specify which Payment Gateway in Recurly must handle the payment.
   */
  gatewayCode?: string
};

export type AmazonPayEvent = 'token' | 'error' | 'close';

export interface AmazonPayInstance extends Emitter<AmazonPayEvent> {
  /**
   * Invokes the Amazon Payment Modal
   */
  start: (amazonPayOptions: AmazonPayOptions) => void;
}

export type AmazonPay = (amazonPayOptions?: AmazonPayOptions) => AmazonPayInstance;
