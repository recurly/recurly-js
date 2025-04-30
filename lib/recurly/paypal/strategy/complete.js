import { PayPalStrategy } from './index';

const PAYPAL_COMPLETE_START_PATH = '/paypal_complete/start';

/**
 * PayPal Complete strategy
 */
export class CompleteStrategy extends PayPalStrategy {
  constructor (...args) {
    super(...args);
    this.emit('ready');
  }

  get payload () {
    let payload = {};
    if (this.config.gatewayCode) payload.gatewayCode = this.config.gatewayCode;
    return payload;
  }

  start () {
    const { payload } = this;
    const frame = this.frame = this.recurly.Frame({ path: PAYPAL_COMPLETE_START_PATH, payload });

    frame.once('done', token => this.emit('token', token));
    frame.once('close', () => this.emit('cancel'));
    frame.once('error', cause => {
      if (cause.code === 'paypal-cancel') this.emit('cancel');
      this.error('paypal-tokenize-error', { cause });
    });
  }

  destroy () {
    if (this.frame) {
      this.frame.destroy();
    }
    this.off();
  }
}
