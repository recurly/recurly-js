import Emitter from 'component-emitter';
import Promise from 'promise';
import recurlyError from '../errors';
import { loadScript, loadStyle } from '../../util/dom';
import AdyenGateway from './gateways/adyen';

class PaymentMethods extends Emitter {
  constructor (recurly, options) {
    super();
    this.recurly = recurly;
    this.options = options;

    // props defined through the payment-method life cycle
    this.gatewayStrategy = undefined;
    this.webComponent = undefined;
    this.stateData = undefined;
  }

  async start () {
    try {
      await this.validateOptions();
      const { gatewayType, paymentMethodData } = await this.getPaymentMethods();
      this.gatewayStrategy = await this.selectGatewayStrategy(gatewayType);
      this.gatewayStrategy.on('submit', () => {
        this.tokenize();
      });
      await this.setupGatewayStrategyListeners();
      await this.loadExternalLibraries();
      this.webComponent = await this.initWebComponent(paymentMethodData);
    } catch(err) {
      this.error(err);
    }
  }

  async tokenize () {
    try {
      const token = await this.tokenizePaymentMethod();
      this.emit('token', token);
    } catch (err) {
      this.error(err);
    }
  }

  async handlePaymentAction (paymentResponse) {
    try {
      this.gatewayStrategy.handlePaymentAction(paymentResponse);
    } catch (err) {
      this.error(err);
    }
  }

  error (err) {
    return this.emit('error', err);
  }

  // private

  async validateOptions () {
    const requiredFields = [
      'allowedPaymentMethods',
      'currency',
      'amount',
      'countryCode',
      'publicKey',
      'containerSelector',
    ];

    const missingField = requiredFields.find(f => !(f in this.options));
    if (missingField) {
      throw recurlyError('payment-methods-config-missing', { opt: missingField });
    }
  }

  async getPaymentMethods () {
    return this.recurly.request.get('/payment-methods/list', {
      allowedPaymentMethods: this.options.allowedPaymentMethods,
      blockedPaymentMethods: this.options.blockedPaymentMethods,
      currency: this.options.currency,
      amount: this.options.amount,
      countryCode: this.options.countryCode,
      locale: this.options.locale || 'en-US',
      channel: this.options.channel || 'Web',
    });
  }

  async selectGatewayStrategy (gatewayType) {
    const gatewayClass = {
      adyen: AdyenGateway,
    }[gatewayType];

    if (!gatewayClass) {
      throw recurlyError('payment-methods-not-available');
    }

    return new gatewayClass(this.options);
  }

  async setupGatewayStrategyListeners () {
    this.gatewayStrategy.on('change', stateData => {
      this.stateData = stateData;
    });

    this.gatewayStrategy.on('submit', stateData => {
      this.stateData = stateData;
      this.tokenize();
    });
  }

  async loadExternalLibraries () {
    if (this.gatewayStrategy.libsLoaded()) {
      return;
    }

    return Promise.all([
      ...this.gatewayStrategy.scripts().map(({ url, ...attrs }) => loadScript(url, attrs)),
      ...this.gatewayStrategy.styles().map(({ url, ...attrs }) => loadStyle(url, attrs)),
    ]);
  }

  async initWebComponent (paymentMethodData) {
    return this.gatewayStrategy.createAndMountWebComponent(paymentMethodData);
  }

  async tokenizePaymentMethod () {
    return this.recurly.request.post('/payment-methods/tokenize', {
      currency: this.options.currency,
      amount: this.options.amount,
      countryCode: this.options.countryCode,
      locale: this.options.locale || 'en-US',
      channel: this.options.channel || 'Web',
      paymentMethodData: this.gatewayStrategy.data,
    });
  }
}

export default PaymentMethods;
