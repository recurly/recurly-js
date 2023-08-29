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
    }).on('error', cause => console.log(cause))
      .on('done', results => {
        this.emit('token', results);
      });
  }
}

export default AmazonPay;
