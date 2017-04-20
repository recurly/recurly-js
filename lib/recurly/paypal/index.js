import omit from 'lodash.omit';
import Emitter from 'component-emitter';
import {DirectStrategy} from './strategy/direct';
import {BraintreeStrategy} from './strategy/braintree';

const debug = require('debug')('recurly:paypal');

/**
 * PayPal instantiation factory
 *
 * @param {Object} options
 * @return {PayPal}
 */
export function factory (options) {
  options = Object.assign({}, options, { recurly: this });
  return new PayPal(options);
}

const DEFERRED_EVENTS = [
  'ready',
  'token',
  'error'
];

/**
 * PayPal strategy interface
 */
class PayPal extends Emitter {
  constructor (options) {
    super();
    this.isReady = false;
    this.options = options;

    this.once('ready', () => this.isReady = true);

    if (options.braintree) {
      this.strategy = new BraintreeStrategy(options);
      this.strategy.onFail(this.fallback.bind(this));
    } else {
      this.strategy = new DirectStrategy(options);
    }

    this.bindStrategy();
  }

  ready (done) {
    if (this.isReady) done();
    else this.once('ready', done);
  }

  start (...args) {
    return this.strategy.start(...args);
  }

  /**
   * Handles strategy failure scenario
   *
   * @private
   */
  fallback () {
    debug('Initializing strategy fallback');
    this.strategy = new DirectStrategy(omit(this.options, 'braintree'));
    this.bindStrategy();
    this.strategy.ready(() => this.emit('ready'));
  }

  /**
   * Binds external interface events to those on the strategy
   *
   * @private
   */
  bindStrategy () {
    DEFERRED_EVENTS.forEach(ev => this.strategy.on(ev, this.emit.bind(this, ev)));
  }
}
