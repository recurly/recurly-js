import Emitter from 'component-emitter';
import { Recurly } from '../../../recurly';
import errors from '../../errors';

const debug = require('debug')('recurly:venmo:strategy');

/**
 * Venmo base interface strategy
 *
 * @abstract
 */
export class VenmoStrategy extends Emitter {
  constructor (options) {
    super();
    this.isReady = false;
    this.config = {};

    this.once('ready', () => this.isReady = true);

    this.configure(options);
  }

  ready (done) {
    if (this.isReady) done();
    else this.once('ready', done);
  }

  configure (options) {
    if (!(options.recurly instanceof Recurly)) throw this.error('venmo-factory-only');
    this.recurly = options.recurly;
  }

  initialize () {
    debug("Method 'initialize' not implemented");
  }

  /**
   * Starts the Venmo flow
   * > must be on the call chain with a user interaction (click, touch) on it
   */
  start () {
    debug("Method 'start' not implemented");
  }

  cancel () {
    this.emit('cancel');
  }

  /**
   * Registers or immediately invokes a failure handler
   *
   * @param {Function} done Failure handler
   */
  onFail (done) {
    if (this.failure) done();
    else this.once('fail', done);
  }

  /**
   * Logs and announces a failure to initialize a strategy
   *
   * @private
   * @param  {String} reason
   * @param  {Object} [options]
   */
  fail (reason, options) {
    if (this.failure) return;
    debug('Failure scenario encountered', reason, options);
    const failure = this.failure = this.error(reason, options);
    this.emit('fail', failure);
  }

  /**
   * Creates and emits a RecurlyError
   *
   * @protected
   * @param  {...Mixed} params to be passed to the Recurlyerror factory
   * @return {RecurlyError}
   * @emit 'error'
   */
  error (...params) {
    let err = params[0] instanceof Error ? params[0] : errors(...params);
    this.emit('error', err);
    return err;
  }

  /**
   * Updates price information from a Pricing instance
   *
   * @private
   */
  updatePriceFromPricing () {
    this.config.display.amount = this.pricing.totalNow;
    this.config.display.currency = this.pricing.currencyCode;
  }
}
