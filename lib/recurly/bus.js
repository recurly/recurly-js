
/*!
 * Module dependencies.
 */

var json = require('json');
var debug = require('debug')('recurly:bus');

/**
 * expose
 */

module.exports = new Bus;

/**
 * Hosted field generic message bus
 */

function Bus () {
  this.receivers = {};
}

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
  // receivers[id].postMessage(message);
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
