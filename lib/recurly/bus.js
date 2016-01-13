import bind from 'component-bind';
import Emitter from 'component-emitter';
import {Message} from './message';

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
    window.addEventListener('message', this.receive.bind(this), false);
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
    this.send(new Message(message), null, { exclude: [message.srcElement] });
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
    if (typeof recipient.emit === 'function') recipient.emit('bus:added', this);
    debug('added recipient', recipient);
  }

  /**
   * Sends a generic message to all recipients
   *
   * TODO: package formatting
   *
   * @param {String} event name of the message's event
   * @param {Object} body message contents
   * @public
   */
  send (event, body, options = { exclude: [] }) {
    const message = new Message(event, body);
    const {exclude} = options;

    debug(`sending message to ${this.recipients.length} recipients`, message);
    this.recipients.forEach(r => {
      if (r.postMessage) r.postMessage(message, '*');
      else if (typeof r.emit === 'function') r.emit(message.event, message.body);
    });
  }
}
