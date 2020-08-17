import { IntervalWorker } from './worker';

const debug = require('debug')('recurly:reporter');

/**
 * Reports events to the API
 *
 * @param {Object} options
 * @param {Recurly} options.recurly
 */
export class Reporter {
  constructor ({ recurly }) {
    this.pool = [];
    this.recurly = recurly;
    if (!this.shouldDispatch) return;
    this.worker = new IntervalWorker({ perform: this.deliver.bind(this) });
    try {
      this.worker.start();
    } catch (err) {
      debug('Error starting worker', err);
    }
  }

  /**
   * Sends a reporting event to be dispatched
   *
   * Warning: any errors that occur in this code path risk a
   * stack overflow
   *
   * @param  {String} name event name
   * @param  {Object} meta event metadata
   */
  send (name, meta) {
    if (!this.shouldDispatch) return;
    this.pool.push(this.payload(name, meta));
  }

  /**
   * Stops the worker and removes external references
   *
   * @return {[type]} [description]
   */
  destroy () {
    debug('destroying reporter');
    if (this.worker) {
      this.worker.destroy();
      delete this.worker;
    }
  }

  /**
   * Whether events should be dispatched
   *
   * @return {Boolean}
   * @private
   */
  get shouldDispatch () {
    return this.recurly.isParent;
  }

  /**
   * Delivery job. Sends events in a queued request to the events endpoint
   *
   * @private
   */
  deliver () {
    if (this.pool.length === 0) return;
    const data = { events: this.pool.splice(0, this.pool.length) };
    this.recurly.request.queued({ method: 'post', route: '/events', data });
  }

  /**
   * Formats an event payload
   *
   * @param {String} name event name
   * @param {Object} [meta] event metadata
   * @private
   */
  payload (name, meta) {
    return {
      name,
      meta,
      occurredAt: new Date().toISOString()
    };
  }
}
