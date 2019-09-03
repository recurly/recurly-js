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

  get payload () {
    let payload = { description: this.config.display.displayName };
    if (this.config.display.amount) payload.amount = this.config.display.amount;
    if (this.config.display.logoImageUrl) payload.logoImageUrl = this.config.display.logoImageUrl;
    if (this.config.display.headerImageUrl) payload.headerImageUrl = this.config.display.headerImageUrl;
    return payload;
  }

  start () {
    const { payload } = this;
    const frame = this.recurly.Frame({ path: '/paypal/start', payload });
    frame.once('done', token => this.emit('token', token));
    frame.once('close', () => this.emit('cancel'));
    frame.once('error', cause => {
      if (cause.code === 'paypal-cancel') this.emit('cancel');
      this.error('paypal-tokenize-error', { cause })
    });
  }
}

/**
 * Deprecated Paypal method
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
