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
 * @param {String} options.selector container selector
 * @private
 */

function HostedField (options) {
  this.config = options;
  this.inject();
  this.classes();
}

HostedField.prototype.inject = function () {
  let container = window.document.querySelector(this.config.selector);

  container.innerHTML = `
    <div class="${this.classes()}">
      <iframe src="${this.url()}" frameborder="0"></iframe>
    </div>
  `;
}

HostedField.prototype.classes = function () {
  const prefix = 'recurly-hosted-field';
  let classes = [prefix];

  classes.push(`${prefix}-${this.config.type}`);
  // TODO: add more classes for various field states

  return classes.join(' ');
}

HostedField.prototype.url = function (type = '') {
  return `${this.config.api}/field?type=${type}`
}
