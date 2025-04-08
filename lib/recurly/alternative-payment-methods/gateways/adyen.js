import Base from './base';
import AlternativePaymentMethods from '../alternative-payment-methods';


class AdyenGateway extends Base {
  constructor (options, recurly) {
    super(options);
    this.recurly = recurly;
    this.state = {};
    this.gatewayType = 'adyen';
    this.webComponent = undefined;
    this.customerBillingAddress = undefined;

    if (options.customer?.billingAddress) {
      AlternativePaymentMethods.validateBillingAddress(options.customer.billingAddress);
      this.customerBillingAddress = options.customer.billingAddress;
    }
  }

  scripts () {
    return [
      {
        url: 'https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.65.0/adyen.js',
        urlintegrity: 'sha384-EedHbKYY/Ev3kVMABmp+l25jEaNxkVg45aee29kCwCpd4DAQaNsVd3pgArwZX3JJ',
        crossorigin: 'anonymous',
      },
    ];
  }

  styles () {
    return [
      {
        url: 'https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.65.0/adyen.css',
        integrity: 'sha384-Dk62669n9Ic7V6K8X7MBAOEZ5IQ9Qq29nW/zPkfwg1ghqyZLiuSc5QYQJ6M72iNR',
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
      analytics: { enabled: false },
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

  async destroy () {
    this.webComponent?.remove();
    delete this.webComponent;
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
    if (billingAddress) { this.customerBillingAddress = billingAddress; }
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
