/**
 * dependencies
 */

const debug = require('debug')('recurly:HostedFields');

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
  container.innerHTML = `<iframe src="http://api.lvh.me:3000/js/v1/field" frameborder="0"></iframe>`;
}
