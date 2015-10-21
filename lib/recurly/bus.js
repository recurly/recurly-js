
/*!
 * Module dependencies.
 */

const bind = require('bind');
const json = require('json');
const debug = require('debug')('recurly:bus');

/**
 * expose
 */

module.exports = Bus;

/**
 * Hosted field generic message bus
 */

function Bus () {
  this.receivers = [];
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

Bus.prototype.receive = function (message) {
  // TODO: filter messages before dispatching
  if (!message.data.event) return;
  this.send(message.data);
};

/**
 * Adds a receiver to the bus
 *
 * @todo add identifier, return that
 *
 * @param {HTMLIFrameElement} receiver frame that may receive messages
 */
Bus.prototype.add = function (receiver) {
  this.receivers.push(receiver);
};

/**
 * Sends a generic message to a receiver
 *
 * TODO: package formatting
 *
 * @param {Object} message
 */
Bus.prototype.send = function (message) {
  this.receivers.forEach(r => {
    if (r.postMessage) r.postMessage(message, '*');
    else if (r.emit) r.emit(message.event, message.body);
  });
};

/**
 * Sends a generic message to a receiver
 *
 * @param {Object} message
 * @param {HTMLIFrameElement} id of the receiver
 */
Bus.prototype.rpc = function (call, id, done) {
  // TODO: set up a message listener to receive the response
  this.send(call, id);
};
