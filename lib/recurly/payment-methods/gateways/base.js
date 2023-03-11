import Emitter from 'component-emitter';

const notImplementedError = new Error('not implemented');

class Base extends Emitter {
  constructor (options) {
    super();

    if (this.constructor == Base) {
      throw new Error('Base class cannot be instantiated');
    }

    this.options = options;
  }

  scripts () {
    throw notImplementedError;
  }

  styles () {
    throw notImplementedError;
  }

  libsLoaded () {
    throw notImplementedError;
  }

  async createAndMountWebComponent (/* paymentMethodData */) {
    throw notImplementedError;
  }

  get data () {
    throw notImplementedError;
  }

  async handlePaymentAction (/* paymentResult */) {
    throw notImplementedError;
  }
}

export default Base;
