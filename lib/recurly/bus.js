
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
  this.receivers = {};
  this.connect();
}

/**
 * Connects the bus to the window's postMessage events
 *
 * @private
 */
Bus.prototype.connect = function () {
  window.addEventListener('message', bind(this, this.dispatch), false);
};


Bus.prototype.dispatch = function () {
  console.log('Bus received message', arguments);
};

/**
 * Adds a receiver to the bus
 *
 * @todo add identifier, return that
 *
 * @param {HTMLIFrameElement} receiver frame that may receive messages
 */
Bus.prototype.add = function (id, receiver) {
  this.receivers[id] = receiver;
};

/**
 * Sends a generic message to a receiver
 *
 * @param {Object} message
 * @param {HTMLIFrameElement} id of the receiver
 */
Bus.prototype.send = function (message, id) {
  // TODO: specify origin
  receivers[id].postMessage(message);
};

/**
 * Sends a generic message to a receiver
 *
 * @param {Object} message
 * @param {HTMLIFrameElement} id of the receiver
 */
Bus.prototype.rpc = function (call, id, done) {
  // @todo set up a message listener to receive the response

  this.send(call, id);
};

/**
 * Generates a message identifier
 *
 * @todo use uuids
 *
 * @return {String} identifier
 */
Bus.prototype.identifier = function () {
  return Math.floor(Math.random() * 10000);
};
