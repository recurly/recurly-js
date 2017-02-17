import loadScript from 'load-script';
import Emitter from 'component-emitter';
import errors from '../../errors';

const debug = require('debug')('recurly:paypal:braintree');

/**
 * Braintree-specific PayPal handler
 *
 * TODO: make inherit from PayPal instead of Emitter to consolidate error handler and init
 */

export class BraintreePayPal extends Emitter {
  constructor (options) {
    super();
    this.ready = false;
    this.config = {};
    this.configure(options);
  }

  configure (options) {
    if (!options.braintree || !options.braintree.clientAuthorization) {
      throw this.error('paypal-config-missing', { opt: 'braintree.clientAuthorization'})
    }
    this.config.clientAuthorization = options.braintree.clientAuthorization;
    this.recurly = options.recurly;
    this.load();
  }

  load () {
    debug('loading Braintree libraries');
    loadScript('https://js.braintreegateway.com/web/3.6.3/js/client.min.js', () => {
      loadScript('https://js.braintreegateway.com/web/3.6.3/js/paypal.min.js', () => {
        this.initialize();
      });
    });
  }

  initialize () {
    if (!global.braintree) return this.error('paypal-braintree-load-error');
    debug('Initializing Braintree client');

    const authorization = this.config.clientAuthorization;

    braintree.client.create({ authorization }, (error, client) => {
      if (error) return this.error('paypal-braintree-api-error', { error });
      debug('Braintree client created');
      braintree.paypal.create({ client }, (error, paypal) => {
        if (error) return this.error('paypal-braintree-api-error', { error });
        debug('PayPal client created');
        this.paypal = paypal;
        this.ready = true;
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

      // Tokenize with Recurly
      this.recurly.request('post', '/paypal/token', { payload }, (error, token) => {
        if (error) return this.error('paypal-braintree-tokenize-recurly-error', { error });
        this.emit('token', token);
      });
    });
  }

  /**
   * Creates and emits a RecurlyError
   *
   * @param  {...Mixed} params to be passed to the Recurlyerror factory
   * @return {RecurlyError}
   * @emit 'error'
   * @private
   */
  error (...params) {
    let err = params[0] instanceof Error ? params[0] : errors(...params);
    this.emit('error', err);
    return err;
  }
}
