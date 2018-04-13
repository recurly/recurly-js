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
    const data = payload(options);
    this.recurly.request.post({ route: '/events', data });
  }
}

/**
 * Formats an event payload
 *
 * @param {Object} options
 * @param {String} options.name event name
 */
function payload ({ name }) {
  return { name };
}
