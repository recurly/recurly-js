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

  send (options) {
    if (!this.shouldDispatch) return;
    this.pool.push(this.payload(options));
  }

  // Private

  get shouldDispatch () {
    return this.recurly.isParent;
  }

  /**
   * Delivery job. Sends events in a queued request to the events endpoint
   */
  deliver () {
    if (this.pool.length === 0) return;
    const data = { events: this.pool.splice(0, this.pool.length) };
    this.recurly.request.queued({ method: 'post', route: '/events', data });
  }

  /**
   * Formats an event payload
   *
   * @param {Object} options
   * @param {String} options.name event name
   */
  payload ({ name }) {
    return {
      name,
      occurred_at: new Date().toISOString(),
      instance_id: this.recurly.id
    };
  }
}
