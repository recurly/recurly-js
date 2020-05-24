import Emitter from 'component-emitter';
import { BraintreeStrategy } from './strategy/braintree';

/**
 * Venmo instantiation factory
 *
 * @param {Object} options
 * @return {Venmo}
 */
export function factory (options) {
  options = Object.assign({}, options, { recurly: this });
  return new Venmo(options);
}

const DEFERRED_EVENTS = [
  'ready',
  'token',
  'error',
  'cancel'
];

/**
 * Venmo strategy interface
 */
class Venmo extends Emitter {
  constructor (options) {
    super();
    this.isReady = false;
    this.options = options;

    this.once('ready', () => this.isReady = true);

    this.strategy = new BraintreeStrategy(options);

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
   * Binds external interface events to those on the strategy
   *
   * @private
   */
  bindStrategy () {
    DEFERRED_EVENTS.forEach(ev => this.strategy.on(ev, this.emit.bind(this, ev)));
  }
}
