import Emitter from 'component-emitter';
import { DirectStrategy } from './strategy/direct';
import { BraintreeStrategy } from './strategy/braintree';
import { CompleteStrategy } from './strategy/complete';

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
  'error',
  'cancel'
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
    } else if (options.payPalComplete) {
      this.strategy = new CompleteStrategy(options);
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

  destroy () {
    const { strategy } = this;
    if (strategy) {
      strategy.destroy();
      delete this.strategy;
    }
    this.off();
  }

  /**
   * Handles strategy failure scenario
   *
   * @private
   */
  fallback () {
    debug('Initializing strategy fallback');
    let strategyOptions = Object.assign({}, this.options);
    delete strategyOptions.braintree;
    this.strategy = new DirectStrategy(strategyOptions);
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
