/**
 * dependencies
 */

var template = require('./iframe.html');
var debug = require('debug')('recurly:HostedFields');
var errors = require('../errors');

/**
 * expose
 */

module.exports = HostedFields;

/**
 * HostedFields
 *
 * @constructor
 * @param {Object} options
 * @public
 */

function HostedFields (options) {
  this.config = options;
  this.fields = {};
  this.inject();
}

HostedFields.prototype.inject = function () {
  this.fields.number = new HostedField({
    sel: this.config.fields.number
  });
}

/**
 * HostedField
 *
 * @constructor
 * @param {Object} options
 * @param {String} options.sel container selector
 * @private
 */

function HostedField (options) {
  this.inject(options.sel);
}

HostedField.prototype.inject = function (sel) {
  let container = window.document.querySelector(sel);
  container.innerHTML = template;
}
