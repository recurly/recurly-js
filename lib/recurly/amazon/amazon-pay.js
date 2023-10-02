import Emitter from 'component-emitter';
import { Frame } from '../frame';

class AmazonPay extends Emitter {
  constructor (recurly, options) {
    super();
    this.recurly = recurly;
    this.options = options;
  }

  attach (element) {
    this.parent = element;
    this.region = this.options?.region || 'us';
    const defaultEventName = 'amazon-pay';

    this.frame = this.recurly.Frame({
      path: `/amazon_pay/start?region=${this.region}`,
      type: Frame.TYPES.WINDOW,
      defaultEventName
    })
      .on('error', cause => this.emit('error', cause)) // Emitted by js/v1/amazon_pay/cancel
      .on('close', () => this.emit('error', 'closed')) // Emitted by RJS Frame when the window is manually closed
      .on('done', results => this.emit('token', results)); // Emitted by js/v1/amazon_pay/finish
  }
}

export default AmazonPay;
