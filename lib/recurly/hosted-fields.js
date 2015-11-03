/**
 * dependencies
 */

const bind = require('component-bind');
const clone = require('component-clone');
const debug = require('debug')('recurly:HostedFields');
const Emitter = require('component-emitter');

const fieldTypes = ['number', 'month', 'year', 'cvv'];

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
  this.initQueue = clone(fieldTypes);
  this.inject();
}

Emitter(HostedFields.prototype);

HostedFields.prototype.inject = function () {
  this.on('hostedField:ready', bind(this, this.readyHandler));
  fieldTypes.forEach(type => {
    if (!(type in this.config.fields)) return;
    this.fields.push(new HostedField({
      type: type,
      selector: this.config.fields[type],
      recurly: this.config.recurly
    }));
  });
};

HostedFields.prototype.readyHandler = function (body) {
  let pos = this.initQueue.indexOf(body.type);
  if (~pos) this.initQueue.splice(pos, 1);
  if (this.initQueue.length === 0) {
    this.off('hostedField:ready', this.readyHandler);
    this.emit('hostedFields:ready');
  }
};

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
  this.isFocused = false;
  this.inject();
  this.classes();
  // TODO: need this to be specific to this instance
  this.on('focus', bind(this, this.focus));
}

Emitter(HostedField.prototype);

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
};

HostedField.prototype.classes = function () {
  const prefix = 'recurly-hosted-field';
  let classes = [prefix];

  classes.push(`${prefix}-${this.config.type}`);
  if (this.isFocused) {
    classes.push(`${prefix}-${this.config.type}-focus`);
  }
  // TODO: add more classes for various field states: focus, etc.

  return classes.join(' ');
};

HostedField.prototype.focus = function () {
  this.isFocused = true;
  this.classes();
};

HostedField.prototype.blur = function () {
  this.isFocused = false;
  this.classes();
};

HostedField.prototype.url = function () {
  let config = encodeURIComponent(JSON.stringify(this.config));
  return `${this.config.recurly.api}/field?config=${config}`;
};
