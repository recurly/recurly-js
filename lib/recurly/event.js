const debug = require('debug')('recurly:event');

const EVENT_NAMES = [
  'test'
];

/**
 * Event dispatcher
 *
 * @param {Object} options
 * @param {Recurly} options.recurly
 */
export class EventDispatcher {
  constructor ({ recurly }) {
    this.recurly = recurly;
  }

  send (options) {
    const data = this.payload(options);
    this.recurly.request.post({ route: '/events', data });
  }

  /**
   * Formats an event payload
   *
   * @param {Object} options
   * @param {String} options.name event name
   */
  payload ({ name }) {
    const initiatedAt = new Date().toISOString();
    const instanceId = this.recurly.id;
    return { name, initiatedAt, instanceId };
  }
}

