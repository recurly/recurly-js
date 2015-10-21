/**
 * dependencies
 */

const json = require('json');
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
    type: 'number',
    api: this.config.api,
    selector: this.config.fields.number
  });

  this.fields.cvv = new HostedField({
    type: 'cvv',
    api: this.config.api,
    selector: this.config.fields.cvv
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
      <iframe src="${this.url()}" frameborder="0"></iframe>
    </div>
  `;

  this.container = target.children[0];
  this.iframe = this.container.children[0];
}

HostedField.prototype.classes = function () {
  const prefix = 'recurly-hosted-field';
  let classes = [prefix];

  classes.push(`${prefix}-${this.config.type}`);
  // TODO: add more classes for various field states: focus, etc.

  return classes.join(' ');
}

HostedField.prototype.url = function () {
  return `${this.config.api}/field?config=${encodeURIComponent(json.stringify(this.config))}`
}
