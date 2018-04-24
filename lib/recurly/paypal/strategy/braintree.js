import loadScript from 'load-script';
import after from '../../../util/after';
import {PayPalStrategy} from './index';

const debug = require('debug')('recurly:paypal:strategy:braintree');

export const BRAINTREE_CLIENT_VERSION = '3.11.0';

/**
 * Braintree-specific PayPal handler
 */

export class BraintreeStrategy extends PayPalStrategy {
  constructor(...args) {
    super(...args);
    this.load();
  }

  configure (options) {
    super.configure(options);
    if (!options.braintree || !options.braintree.clientAuthorization) {
      throw this.error('paypal-config-missing', { opt: 'braintree.clientAuthorization'})
    }
    this.config.clientAuthorization = options.braintree.clientAuthorization;
  }

  /**
   * Loads Braintree client and modules
   *
   * @todo semver client detection
   */
  load () {
    debug('loading Braintree libraries');

    const part = after(2, () => this.initialize());
    const get = (lib, done = () => {}) => {
      const uri = `https://js.braintreegateway.com/web/${BRAINTREE_CLIENT_VERSION}/js/${lib}.min.js`;
      loadScript(uri, error => {
        if (error) this.error('paypal-load-error', { cause: error });
        else done();
      });
    };

    const modules = () => {
      if (this.braintreeClientAvailable('paypal')) part();
      else get('paypal', part);
      if (this.braintreeClientAvailable('dataCollector')) part();
      else get('data-collector', part);
    }

    if (this.braintreeClientAvailable()) modules();
    else get('client', modules);
  }

  /**
   * Initializes a Braintree client, device data collection module, and paypal client
   */
  initialize () {
    debug('Initializing Braintree client');

    const authorization = this.config.clientAuthorization;
    const braintree = global.braintree;

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
    this.paypal.tokenize(tokenOpts, (error, payload) => {
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
  }

  braintreeClientAvailable (module) {
    const bt = global.braintree;
    return bt && bt.client && bt.client.VERSION === BRAINTREE_CLIENT_VERSION && (module ? module in bt : true);
  }
}
