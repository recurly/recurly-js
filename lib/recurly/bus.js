import Emitter from 'component-emitter';
import { Message } from './message';
import uid from '../util/uid';

/**
 * Hosted field generic message bus
 *
 * Listens to message events on the window, filters recurly messages,
 * and emits them to all registered recipients
 *
 * May also receive generic messages, which it sends to all recipients
 */

export class Bus extends Emitter {
  constructor (options = {}) {
    super();
    this.id = uid();
    this.groupId = options.groupId || uid();
    this.emitters = [];
    this.recipients = [];
    this.receive = this.receive.bind(this);
    this.config = { api: options.api };
    this.debug = require('debug')(
      `recurly:bus:${options.role ? `${options.role}:` : ''}${this.id.split('-')[0]}`
    );
    this.connect();
    this.send = this.send.bind(this);
  }

  connect () {
    window.addEventListener('message', this.receive, false);
    this.debug('listening for postMessage events on', window);
  }

  /**
   * Receives a postMessage, filters it, and sends it out
   *
   * @private
   * @param {MessageEvent} messageEvent
   */
  receive (messageEvent) {
    // allow for listening to the raw message spout
    this.emit('raw-message', messageEvent);
    if (!this.originMatches(messageEvent.origin)) return;
    this.debug('message event received', messageEvent.data);
    const message = Message.createFromMessageEvent(messageEvent, this.debug.bind(this));
    if (!this.shouldHandleMessage(message)) return;
    this.send(message, null, { exclude: [messageEvent.srcElement, messageEvent.source] });
  }

  /**
   * Adds a recipient to the bus
   *
   * @public
   * @param {Window|Emitter} recipient that may receive messages from `send`
   */
  add (recipient) {
    if (~this.recipients.indexOf(recipient)) return;
    this.recipients.push(recipient);
    if (recipient instanceof Emitter) recipient.emit('bus:added', this);
    this.debug(`added recipient. Total: ${this.recipients.length}`, recipient);
  }

  /**
   * Remnoves a recipient from the bus
   *
   * @public
   * @param {Window|Emitter} recipient to remove
   * @return {Boolean} whether the removal was performed
   */
  remove (recipient) {
    const pos = this.recipients.indexOf(recipient);
    return !!(~pos && this.recipients.splice(pos, 1));
  }

  /**
   * Sends a generic message to all recipients
   *
   * @public
   * @param {String} event name of the message's event
   * @param {Object} body message contents
   * @param {Object} [options]
   * @param {Array} [options.exclude] a list of recipients to exlude from receiving the message
   */
  send (event, body, options = { exclude: [] }) {
    const { groupId } = this;
    const message = new Message(event, body, groupId);
    const { exclude } = options;

    if (!message.event) {
      this.debug(`discarding message due to lack of event name`, message);
      return;
    }

    const recipients = this.recipients.filter(r => !~exclude.indexOf(r));

    this.debug(`sending message to ${recipients.length} recipients`, recipients, message);
    recipients.forEach(r => {
      if (r.postMessage) {
        if (typeof r.postMessage === 'function') r.postMessage(message, '*');
      } else if (typeof r.emit === 'function') {
        r.emit(message.event, message.body);
      }
    });
  }

  /**
   * Empties recipients and disconnects the listener
   *
   * @public
   */
  destroy () {
    this.debug('destroying bus', this.groupId, this.id);
    this.recipients = [];
    window.removeEventListener('message', this.receive, false);
  }

  /**
   * Determines whether a message received should be handled by this bus
   *
   * @private
   * @param {Message} message
   */
  shouldHandleMessage (message) {
    // If a message has a group id, it must match
    if (message.groupId) return message.groupId === this.groupId;
    return true;
  }

  /**
   * Checks a message origin for compatibility
   *
   * @private
   * @param {String} url message origin url
   */
  originMatches (url) {
    return origin(url) === origin(this.config.api);
  }
}

/**
 * Parses an origin from a url
 *
 * @private
 * @param  {String} url
 * @return {Boolean}
 */
function origin (url) {
  let parser = window.document.createElement('a');
  parser.href = url;
  return `${parser.protocol}//${parser.host}`;
}
