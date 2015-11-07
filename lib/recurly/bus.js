const bind = require('component-bind');
const Emitter = require('component-emitter');
const Message = require('./message').Message;
const debug = require('debug')('recurly:bus');

/**
 * Hosted field generic message bus
 *
 * Listens to message events on the window, filters recurly messages,
 * and emits them to all registered recipients
 *
 * May also receive generic messages, which it sends to all recipients
 */

export class Bus extends Emitter {
  constructor () {
    super();
    this.emitters = [];
    this.recipients = [];
    this.connect();
    this.send = bind(this, this.send);
  }

  connect () {
    window.addEventListener('message', bind(this, this.receive), false);
    debug('listening for postMessage events on', window);
  }

  /**
   * Receives a postMessage, filters it, and sends it out
   *
   * @param {MessageEvent} message
   * @private
   */
  receive (message) {
    // TODO: filter messages before dispatching
    if (!message.data.event) return;
    debug('message received', message.data);
    this.send(new Message(message));
  }

  /**
   * Adds a recipient to the bus
   *
   * @todo add identifier, return that
   *
   * @param {Window|Emitter} recipient that may receive messages from `send`
   * @public
   */
  add (recipient) {
    if (~this.recipients.indexOf(recipient)) return;
    this.recipients.push(recipient);
    debug('added recipient', recipient);
  }

  /**
   * Sends a generic message to all recipients
   *
   * TODO: package formatting
   *
   * @param {Object} message
   * @param {String} message.event name of the message's event
   * @param {Object} message.body message contents
   * @public
   */
  send (event, body) {
    const message = new Message(event, body);
    debug(`sending message to ${this.recipients.length} recipients`, message);
    this.recipients.forEach(r => {
      if (r.postMessage) r.postMessage(message, '*');
      else if (r.emit) r.emit(message.event, message.body);
    });
  }
}
