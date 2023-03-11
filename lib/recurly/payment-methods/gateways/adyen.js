import Base from './base';

class AdyenGateway extends Base {
  constructor (options) {
    super(options);

    this.state = undefined;
    this.webComponent = undefined;
  }

  scripts () {
    return [
      {
        url: 'https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.31.1/adyen.js',
        urlintegrity: 'sha384-d6l5Qqod+Ks601U/jqsLz7QkW0LL6T5pfEsSHypuTSnDUYVGRLNV1ZdITbEwb1yL',
        crossorigin: 'anonymous',
      },
    ];
  }

  styles () {
    return [
      {
        url: 'https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.31.1/adyen.css',
        integrity: 'sha384-u0ZzEn9TjQx9ID0fkB21aOi32DxL9+b2ngTVz2x3q5wTi8sMfW3l49Dpe+TmBhb2',
        crossorigin: 'anonymous',
      },
    ];
  }

  libsLoaded () {
    return !!window.AdyenCheckout;
  }

  async createAndMountWebComponent (paymentMethodData) {
    const adyenOpts = this.options.adyen || {};

    const checkout = await window.AdyenCheckout({
      clientKey: this.options.publicKey,
      locale: this.options.locale || 'en-US',
      countryCode: this.options.countryCode,
      paymentMethodsResponse: paymentMethodData,
      environment: adyenOpts.env || 'test',
      showPayButton: adyenOpts.showPayButton || false,
      amount: adyenOpts.showPayButton
        ? {
          value: this.options.amount,
          currency: this.options.currency
        }
        : this.options.amount,
      onChange: ([state]) => {
        this.state = state;
      },
      onSubmit: ([state]) => {
        this.state = state;
        this.emit('submit');
      },
    });

    this.webComponent = checkout
      .create('dropin', adyenOpts.componentConfig || {})
      .mount(this.options.containerSelector);

    return this.webComponent;
  }

  get data () {
    return this.state.data;
  }

  async handlePaymentAction (paymentResponse) {
    if (!paymentResponse?.action) {
      return;
    }

    return this.webComponent.handleAction(paymentResponse.action);
  }
}

export default AdyenGateway;
