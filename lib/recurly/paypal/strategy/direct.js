import Promise from 'promise';
import {PayPalStrategy} from './index';

const debug = require('debug')('recurly:paypal:strategy:direct');

/**
 * Direct PayPal Express Checkout strategy
 */
export class DirectStrategy extends PayPalStrategy {
  constructor (...args) {
    super(...args);
    this.emit('ready');
  }

  start () {
    // TODO: More parameters here
    const payload = { description: this.config.display.displayName };
    const frame = this.recurly.Frame({ path: '/paypal/start', payload });
    frame.once('error', cause => this.error('paypal-tokenize-error', { cause }));
    frame.once('done', token => this.emit('token', token));
  }
}

/**
 * Deprecated Paypal mixin.
 *
 * @deprecated
 * @param {Object} payload
 * @param {String} payload.description - transaction description
 * @param {Function} done callback
 */

export function deprecated (payload, done) {
  debug('start');
  const frame = this.Frame({ path: '/paypal/start', payload });
  frame.once('error', error => done(error));
  frame.once('done', token => done(null, token));
}
