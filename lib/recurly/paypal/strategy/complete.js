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

  start () {
    const frame = this.frame = this.recurly.Frame({ path: PAYPAL_COMPLETE_START_PATH });
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
