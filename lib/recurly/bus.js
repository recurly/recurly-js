import Emitter from 'component-emitter';
import {Message} from './message';
import uuid from 'uuid/v4';

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
    this.id = uuid();
    this.groupId = options.groupId || uuid();
    this.debug = require('debug')(`recurly:bus:${this.id.split('-')[0]}`);
    this.emitters = [];
    this.recipients = [];
    this.receive = this.receive.bind(this);
    this.config = { api: options.api };
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
   * @param {MessageEvent} message
   */
  receive (message) {
    if (!this.originMatches(message.origin)) return;
    if (!this.groupMatches(message)) return;
    if (typeof message.data === 'string') return this.receiveFromRelay(message)
    if (!message.data.event) return;
    this.debug('message received', message.data);
    this.send(new Message(message), null, { exclude: [message.srcElement] });
  }

  /**
   * Parses message properties from a JSON-encoded string
   *
   * @private
   * @param  {String} message
   * @return {Object} message
   */
  receiveFromRelay (message) {
    let data;
    try {
      data = JSON.parse(message.data);
    } catch (e) {
      this.debug('failed to parse a string message', e, message);
    }
    if (!data) return;
    this.debug('message received via relay', data);
    this.send(data.recurly_event, data.recurly_message);
  }

  /**
   * Adds a recipient to the bus
   *
   * @todo add identifier, return that
   *
   * @public
   * @param {Window|Emitter} recipient that may receive messages from `send`
   */
  add (recipient) {
    if (~this.recipients.indexOf(recipient)) return;
    this.recipients.push(recipient);
    if (typeof recipient.emit === 'function') recipient.emit('bus:added', this);
    this.debug('added recipient', recipient);
  }

  /**
   * Sends a generic message to all recipients
   *
   * @public
   * @param {String} event name of the message's event
   * @param {Object} body message contents
   * @param {Object} [options]
   * @param {Array} [options.exclude] a list of
   */
  send (event, body, options = { exclude: [] }) {
    const { groupId } = this;
    const message = new Message(event, body, groupId);
    const { exclude } = options;

    this.debug(`sending message to ${this.recipients.length} recipients`, message);
    this.recipients.forEach(r => {
      if (~exclude.indexOf(r)) return;
      if (r.postMessage) {
        if (typeof r.postMessage === 'function') r.postMessage(message, '*');
      } else if (typeof r.emit === 'function') {
        r.emit(message.event, message.body);
      }
    });
  }

  /**
   * Stops the bus
   *  - Empties recipients
   *  - disconnects listener
   *
   * @public
   */
  stop () {
    this.recipients = [];
    window.removeEventListener('message', this.receive, false);
  }

  /**
   * Checks a message origin for compatibility
   *
   * @param {String} url message origin url
   * @private
   */
  originMatches (url) {
    return origin(url) === origin(this.config.api);
  }

  /**
   * Checks if a message is intended for this bus.
   *
   * Accepts messages with a groupId matching this bus, and messages without a groupId
   *
   * @param {Message} message
   * @return {Boolean} whether it matches
   * @private
   */
  groupMatches (message) {
    const { groupId } = message.data;
    if (!groupId) return true;
    return groupId === this.id;
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
