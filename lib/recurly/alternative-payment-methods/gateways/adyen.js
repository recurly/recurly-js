import Base from './base';

class AdyenGateway extends Base {
  constructor (options, recurly) {
    super(options);
    this.recurly = recurly;
    this.state = {};
    this.gatewayType = 'adyen';
    this.webComponent = undefined;
    this.customerBillingAddress = undefined;
  }

  scripts () {
    return [
      {
        url: 'https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.44.0/adyen.js',
        urlintegrity: 'sha384-EedHbKYY/Ev3kVMABmp+l25jEaNxkVg45aee29kCwCpd4DAQaNsVd3pgArwZX3JJ',
        crossorigin: 'anonymous',
      },
    ];
  }

  styles () {
    return [
      {
        url: 'https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.44.0/adyen.css',
        integrity: 'sha384-ncGh5IPNy7Xx9N0SGgkQn36wdbE16y1E/iHvYdCiJqdNldS7gusM2QlbIIN77h1X',
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
      clientKey: adyenOpts.publicKey,
      locale: this.options.locale || 'en-US',
      countryCode: this.options.countryCode,
      paymentMethodsResponse: paymentMethodData,
      environment: adyenOpts.env || 'test',
      showPayButton: adyenOpts.showPayButton || false,
      paymentMethodsConfiguration: {
        cashapp: {
          storePaymentMethod: true,
        }
      },
      setStatusAutomatically: adyenOpts.setStatusAutomatically || false,
      amount: adyenOpts.showPayButton
        ? {
          value: this.options.amount,
          currency: this.options.currency
        }
        : this.options.amount,
      onChange: state => {
        this.state = state;
        this.emit('change', state.isValid);
      },
      onSubmit: state => this.onWebComponentSubmit(state),
      onError: err => this.emit('error', err),
    });

    this.webComponent = checkout
      .create('dropin', adyenOpts.componentConfig || {})
      .mount(this.options.containerSelector);

    return this.webComponent;
  }

  get data () {
    const methodState = this.state.data;
    const componentState = this.webComponent?.activePaymentMethod?.data;
    const paymentMethodState = this.webComponent?.activePaymentMethod?.state;

    return { ...methodState, ...componentState, ...paymentMethodState };
  }

  async handleAction (action) {
    return this.webComponent.handleAction(action);
  }

  async submitWebComponent (billingAddress) {
    this.customerBillingAddress = billingAddress;
    return this.webComponent.submit();
  }

  async tokenizePaymentMethod () {
    return this.recurly.request.post({
      route: '/payment_methods/token',
      data: {
        currency: this.options.currency,
        amount: this.options.amount,
        countryCode: this.options.countryCode,
        locale: this.options.locale || 'en-US',
        channel: this.options.channel || 'Web',
        paymentMethodData: this.data,
        gatewayType: this.gatewayType,
        returnURL: this.options.returnURL,
        billingAddress: this.customerBillingAddress,
      },
    });
  }

  onWebComponentSubmit (state) {
    this.state = state;
    this.tokenizePaymentMethod().then(token => {
      this.emit('token', token);
    }).catch(err => {
      this.emit('error', err);
    });
  }
}

export default AdyenGateway;
