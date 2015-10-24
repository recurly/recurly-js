
/*!
 * Module dependencies.
 */

const bind = require('bind');
const json = require('json');
const Emitter = require('emitter');
const debug = require('debug')('recurly:bus');

/**
 * expose
 */

module.exports = Bus;

/**
 * Hosted field generic message bus
 *
 * Listens to message events on the window, filters recurly messages,
 * and emits them to all registered recipients
 *
 * May also receive generic messages, which it sends to all recipients
 */

function Bus () {
  this.recipients = [];
  this.connect();
}

/**
 * Connects the bus to the window's postMessage events
 *
 * @private
 */

Bus.prototype.connect = function () {
  window.addEventListener('message', bind(this, this.receive), false);
};

/**
 * Receives a postMessage, filters it, and sends it out
 *
 * @param {MessageEvent} message
 * @private
 */

Bus.prototype.receive = function (message) {
  // TODO: filter messages before dispatching
  if (!message.data.event) return;
  this.send(message.data);
};

/**
 * Adds a recipient to the bus
 *
 * @todo add identifier, return that
 *
 * @param {Window} recipient window that may receive messages
 * @public
 */

Bus.prototype.add = function (recipient) {
  this.recipients.push(recipient);
};

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

Bus.prototype.send = function (message) {
  this.recipients.forEach(r => {
    if (r.postMessage) r.postMessage(message, '*');
    else if (r.emit) r.emit(message.event, message.body);
  });
};
