/**
 * dependencies
 */

const json = require('json');
const merge = require('merge');
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
 * @param {Object} options.recurly options to init a recurly instance
 * @param {Object} options.fields
 * @param {Object} options.style
 * @public
 */

function HostedFields (options) {
  this.fields = [];
  this.config = options;
  this.inject();
}

HostedFields.prototype.inject = function () {
  ['number', 'month', 'year', 'cvv'].forEach(type => {
    if (!(type in this.config.fields)) return;
    this.fields.push(new HostedField({
      type: type,
      selector: this.config.fields[type],
      recurly: this.config.recurly
    }));
  });
}

/**
 * HostedField
 *
 * @constructor
 * @param {Object} options
 * @param {String} options.selector target selector
 * @private
 */

function HostedField (options) {
  this.config = options;
  this.inject();
  this.classes();
}

HostedField.prototype.inject = function () {
  const target = window.document.querySelector(this.config.selector);

  // TODO: fail if the target is invalid

  target.innerHTML = `
    <div class="${this.classes()}">
      <iframe src="${this.url()}" border="0" frameborder="0" allowtransparency="true"></iframe>
    </div>
  `;

  this.container = target.children[0];
  this.iframe = this.container.children[0];
  this.window = this.iframe.contentWindow;
}

HostedField.prototype.classes = function () {
  const prefix = 'recurly-hosted-field';
  let classes = [prefix];

  classes.push(`${prefix}-${this.config.type}`);
  // TODO: add more classes for various field states: focus, etc.

  return classes.join(' ');
}

HostedField.prototype.url = function () {
  let config = encodeURIComponent(json.stringify(this.config));
  return `${this.config.recurly.api}/field?config=${config}`;
}
