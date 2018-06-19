import {IntervalWorker} from './worker';

const debug = require('debug')('recurly:event');

/**
 * Event dispatcher
 *
 * @param {Object} options
 * @param {Recurly} options.recurly
 */
export class EventDispatcher {
  constructor ({ recurly }) {
    this.pool = [];
    this.recurly = recurly;
    if (!this.shouldDispatch) return;
    this.worker = new IntervalWorker({ perform: this.deliver.bind(this) });
    this.worker.start();
  }

  /**
   * Sends an event to be dispatched
   * @param  {String} name event name
   * @param  {Object} meta event metadata
   */
  send (name, meta) {
    if (!this.shouldDispatch) return;
    this.pool.push(this.payload(name, meta));
  }

  /**
   * Whether events should be dispatched
   * @return {Boolean}
   * @private
   */
  get shouldDispatch () {
    return this.recurly.isParent;
  }

  /**
   * Delivery job. Sends events in a queued request to the events endpoint
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
      instanceId: this.recurly.id,
      occurredAt: new Date().toISOString()
    };
  }
}
