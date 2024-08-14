import BraintreeLoader from '../../../util/braintree-loader';
import { PayPalStrategy } from './index';

const debug = require('debug')('recurly:paypal:strategy:braintree');

/**
 * Braintree-specific PayPal handler
 */

export class BraintreeStrategy extends PayPalStrategy {
  configure (options) {
    super.configure(options);
    if (!options.braintree || !options.braintree.clientAuthorization) {
      throw this.error('paypal-config-missing', { opt: 'braintree.clientAuthorization' });
    }
    this.config.clientAuthorization = options.braintree.clientAuthorization;

    BraintreeLoader.loadModules('paypal', 'dataCollector')
      .catch(cause => this.error('paypal-load-error', { cause }))
      .then(() => this.initialize());
  }

  /**
   * Initializes a Braintree client, device data collection module, and paypal client
   */
  initialize () {
    debug('Initializing Braintree client');

    const authorization = this.config.clientAuthorization;
    const braintree = window.braintree;

    braintree.client.create({ authorization }, (error, client) => {
      if (error) return this.fail('paypal-braintree-api-error', { cause: error });
      debug('Braintree client created');
      braintree.dataCollector.create({ client, paypal: true }, (error, collector) => {
        if (error) return this.fail('paypal-braintree-api-error', { cause: error });
        debug('Device data collector created');
        this.deviceFingerprint = collector.deviceData;
        braintree.paypal.create({ client }, (error, paypal) => {
          if (error) return this.fail('paypal-braintree-api-error', { cause: error });
          debug('PayPal client created');
          this.paypal = paypal;
          this.emit('ready');
        });
      });
    });
  }

  start () {
    let tokenOpts = Object.assign({}, this.config.display, { flow: 'vault' });

    // Tokenize with Braintree
    const { close } = this.paypal.tokenize(tokenOpts, (error, payload) => {
      if (error) {
        if (error.code === 'PAYPAL_POPUP_CLOSED') return this.emit('cancel');
        return this.error('paypal-braintree-tokenize-braintree-error', { cause: error });
      }

      debug('Token payload received', payload);

      if (this.deviceFingerprint) {
        payload.deviceFingerprint = this.deviceFingerprint;
      }

      // Tokenize with Recurly
      this.recurly.request.post({
        route: '/paypal/token',
        data: { type: 'braintree', payload },
        done: (error, token) => {
          if (error) return this.error('paypal-braintree-tokenize-recurly-error', { cause: error });
          this.emit('token', token);
        }
      });
    });

    this.close = close;
  }

  destroy () {
    if (this.close) {
      this.close();
    }
    this.off();
  }
}
