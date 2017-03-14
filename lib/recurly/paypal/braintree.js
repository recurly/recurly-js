import omit from 'lodash.omit';
import after from 'lodash.after';
import loadScript from 'load-script';
import Emitter from 'component-emitter';
import {PayPal} from './';
import errors from '../../errors';

const debug = require('debug')('recurly:paypal:braintree');

const BRAINTREE_CLIENT_VERSION = '3.11.0';

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

  load () {
    debug('loading Braintree libraries');
    get(`https://js.braintreegateway.com/web/${BRAINTREE_CLIENT_VERSION}/js/client.min.js`, () => {
      const part = after(2, this.initialize.bind(this));
      get(`https://js.braintreegateway.com/web/${BRAINTREE_CLIENT_VERSION}/js/paypal.min.js`, part);
      get(`https://js.braintreegateway.com/web/${BRAINTREE_CLIENT_VERSION}/js/data-collector.min.js`, part);
    });

    function get (uri, done) {
      loadScript(uri, (error, script) => {
        if (error) this.fail('paypal-braintree-load-error', { error });
        else done();
      });
    }
  }

  initialize () {
    if (!global.braintree) return this.fail('paypal-braintree-load-error');
    debug('Initializing Braintree client');

    const authorization = this.config.clientAuthorization;

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
          this.ready = true;
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
  start () {
    if (!this.ready) return this.error('paypal-braintree-not-ready');

    // Tokenize with Braintree
    this.paypal.tokenize({ flow: 'vault' }, (error, payload) => {
      if (error) {
        if (error.code === 'PAYPAL_POPUP_CLOSED') return this.emit('cancel');
        return this.error('paypal-braintree-tokenize-braintree-error', { error });
      }

      debug('Token payload received', payload);

      if (this.deviceFingerprint) {
        payload.deviceFingerprint = this.deviceFingerprint;
      }

      // Tokenize with Recurly
      this.recurly.request('post', '/paypal/token', { payload }, (error, token) => {
        if (error) return this.error('paypal-braintree-tokenize-recurly-error', { error });
        this.emit('token', token);
      });
    });
  }

  /**
   * Falls back to non-Braintree PayPal integration
   *
   * @param  {String} reason
   * @param  {Object} options
   * @return {PayPal}
   */
  fail (reason, options) {
    debug('Failure scenario encountered. Falling back to direct PayPal flow', reason, options);
    let failure = this.failure = {};
    if (reason) failure.error = this.error(reason, options);
    failure.fallback = new PayPal(omit(this.config.constructorOptions, 'braintree'));
    this.emit('failure', failure);
    return failure;
  }
}
