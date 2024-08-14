import BraintreeLoader from '../../../util/braintree-loader';
import { VenmoStrategy } from './index';
import { normalize } from '../../../util/normalize';

const debug = require('debug')('recurly:venmo:strategy:braintree');

/**
 * Braintree-specific Venmo handler
 */

export class BraintreeStrategy extends VenmoStrategy {
  configure (options) {
    super.configure(options);

    if (!options.braintree || !options.braintree.clientAuthorization) {
      throw this.error('venmo-config-missing', { opt: 'braintree.clientAuthorization' });
    }
    this.config.clientAuthorization = options.braintree.clientAuthorization;
    this.config.allowDesktopWebLogin = options.braintree.webAuthentication ? options.braintree.webAuthentication : false;

    this.form = options.form;

    BraintreeLoader.loadModules('venmo', 'dataCollector')
      .catch(cause => this.error('venmo-load-error', { cause }))
      .then(() => this.initialize());
  }

  /**
   * Initializes a Braintree client, device data collection module, and venmo client
   */
  initialize () {
    debug('Initializing Braintree client');

    const authorization = this.config.clientAuthorization;
    const braintree = window.braintree;
    const allowDesktopWebLogin = this.config.allowDesktopWebLogin;

    braintree.client.create({ authorization }, (error, client) => {
      if (error) return this.fail('venmo-braintree-api-error', { cause: error });
      debug('Braintree client created');
      braintree.dataCollector.create({ client, paypal: true }, (error, collector) => {
        if (error) return this.fail('venmo-braintree-api-error', { cause: error });
        debug('Device data collector created');
        this.deviceFingerprint = collector.deviceData;
        braintree.venmo.create({
          client,
          allowDesktop: true,
          allowDesktopWebLogin:  allowDesktopWebLogin,
          paymentMethodUsage: 'multi_use',
          collectCustomerBillingAddress: true,
          collectCustomerShippingAddress: true,
        }, (error, venmo) => {
          if (error) return this.fail('venmo-braintree-api-error', { cause: error });
          debug('Venmo client created');
          this.venmo = venmo;
          this.emit('ready');
        });
      });
    });
  }

  handleVenmoError (err) {
    debug('Venmo error', err);
    this.emit('cancel');
    return this.error('venmo-braintree-tokenize-braintree-error', { cause: err });
  }

  handleVenmoSuccess (payload) {
    const nameData = normalize(this.form, ['first_name', 'last_name']);

    if (this.deviceFingerprint) {
      payload.deviceFingerprint = this.deviceFingerprint;
    }

    this.recurly.request.post({
      route: '/venmo/token',
      data: { type: 'braintree', payload: { ...payload, values: nameData.values } },
      done: (error, token) => {
        if (error) return this.error('venmo-braintree-tokenize-recurly-error', { cause: error });
        this.emit('token', token);
      }
    });
  }

  start () {
    // Tokenize with Braintree
    this.venmo.tokenize()
      .then(this.handleVenmoSuccess.bind(this))
      .catch(this.handleVenmoError.bind(this));
  }

  destroy () {
    if (this.close) {
      this.close();
    }
    this.off();
  }
}
