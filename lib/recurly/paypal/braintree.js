import omit from 'lodash.omit';
import after from 'lodash.after';
import loadScript from 'load-script';
import {PayPal} from './';

const debug = require('debug')('recurly:paypal:braintree');

export const BRAINTREE_CLIENT_VERSION = '3.11.0';

/**
 * Braintree-specific PayPal handler
 */

export class BraintreePayPal extends PayPal {
  configure (options) {
    super.configure(options);
    if (!options.braintree || !options.braintree.clientAuthorization) {
      return this.error('paypal-config-missing', { opt: 'braintree.clientAuthorization'})
    }
    this.config.clientAuthorization = options.braintree.clientAuthorization;
    this.load();
  }

  /**
   * Loads Braintree client and modules
   */
  load () {
    debug('loading Braintree libraries');

    const initialize = this.initialize.bind(this);

    if (clientAvailable()) modules();
    else get(`https://js.braintreegateway.com/web/${BRAINTREE_CLIENT_VERSION}/js/client.min.js`, modules);

    function modules () {
      const part = after(2, initialize);
      if (clientAvailable('paypal')) part();
      else get(`https://js.braintreegateway.com/web/${BRAINTREE_CLIENT_VERSION}/js/paypal.min.js`, part);
      if (clientAvailable('dataCollector')) part();
      else get(`https://js.braintreegateway.com/web/${BRAINTREE_CLIENT_VERSION}/js/data-collector.min.js`, part);
    }

    function clientAvailable (module) {
      const bt = global.braintree;
      return bt && bt.client && bt.client.VERSION === BRAINTREE_CLIENT_VERSION && (module ? module in bt : true);
    }

    function get (uri, done) {
      loadScript(uri, (error, script) => {
        if (error) this.fail('paypal-braintree-load-error', { error });
        else done();
      });
    }
  }

  /**
   * Initializes a Braintree client, device data collection module, and paypal client
   */
  initialize () {
    if (!global.braintree) return this.fail('paypal-braintree-load-error');
    debug('Initializing Braintree client');

    const authorization = this.config.clientAuthorization;
    const braintree = global.braintree;

    braintree.client.create({ authorization }, (error, client) => {
      if (error) return this.fail('paypal-braintree-api-error', { error });
      debug('Braintree client created');
      braintree.dataCollector.create({ client, paypal: true }, (error, collector) => {
        if (error) return this.fail('paypal-braintree-api-error', { error });
        debug('Device data collector created');
        this.deviceFingerprint = collector.deviceData;
        braintree.paypal.create({ client }, (error, paypal) => {
          if (error) return this.fail('paypal-braintree-api-error', { error });
          debug('PayPal client created');
          this.paypal = paypal;
          this.emit('ready');
        });
      });
    });
  }

  /**
   * Starts the PayPal flow
   * > must be on the call chain with a user interaction (click, touch) on it
   *
   * @emit 'paypal-braintree-tokenize-braintree-error'
   * @emit 'paypal-braintree-tokenize-recurly-error'
   * @emit 'token'
   * @emit 'cancel'
   */
  start (...args) {
    if (this.failure) return super.start(...args);
    if (!this.readyState) return this.error('paypal-braintree-not-ready');

    let tokenOpts = Object.assign({}, this.config.display, { flow: 'vault' });

    // Tokenize with Braintree
    this.paypal.tokenize(tokenOpts, (error, payload) => {
      if (error) {
        if (error.code === 'PAYPAL_POPUP_CLOSED') return this.emit('cancel');
        return this.error('paypal-braintree-tokenize-braintree-error', { error });
      }

      debug('Token payload received', payload);

      if (this.deviceFingerprint) {
        payload.deviceFingerprint = this.deviceFingerprint;
      }

      // Tokenize with Recurly
      this.recurly.request('post', '/paypal/token', { type: 'braintree', payload }, (error, token) => {
        if (error) return this.error('paypal-braintree-tokenize-recurly-error', { error });
        this.emit('token', token);
      });
    });
  }

  /**
   * Logs a failure to initialize Braintree
   *
   * @param  {String} reason
   * @param  {Object} options
   * @return {PayPal}
   */
  fail (reason, options) {
    if (this.failure) return;
    debug('Failure scenario encountered. Falling back to direct PayPal flow', reason, options);
    let failure = this.failure = {};
    if (reason) failure.error = this.error(reason, options);
    this.emit('failure', failure);
    this.emit('ready');
    return failure;
  }
}
