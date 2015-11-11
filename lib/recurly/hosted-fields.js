const bind = require('component-bind');
const clone = require('component-clone');
const debug = require('debug')('recurly:HostedFields');
const Emitter = require('component-emitter');

const fieldTypes = ['number', 'month', 'year', 'cvv'];

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

export class HostedFields extends Emitter {
  constructor (options) {
    super();
    this.fields = [];
    this.config = options;
    this.inject();
  }

  inject () {
    this.initQueue = clone(fieldTypes);
    this.on('hostedField:ready', bind(this, this.readyHandler));
    fieldTypes.forEach(type => {
      if (!(type in this.config.fields)) return;
      this.fields.push(new HostedField({
        type: type,
        selector: this.config.fields[type],
        style: this.config.style, // TODO: limit this to the style specific to this field
        recurly: this.config.recurly
      }));
    });
  }

  readyHandler (body) {
    let pos = this.initQueue.indexOf(body.type);
    if (~pos) this.initQueue.splice(pos, 1);
    if (this.initQueue.length === 0) {
      this.off('hostedField:ready', this.readyHandler);
      this.emit('hostedFields:ready');
    }
  }
}

/**
 * HostedField
 *
 * @constructor
 * @param {Object} options
 * @param {String} options.selector target selector
 * @private
 */

class HostedField extends Emitter {
  constructor (options) {
    super();
    this.config = options;
    this.isFocused = false;
    this.inject();
    // TODO: need this to be specific to this instance
    this.on('hostedField:focus', bind(this, this.focus));
    this.on('hostedField:blur', bind(this, this.blur));
    this.on('hostedField:change', bind(this, this.change));
  }

  inject () {
    const target = window.document.querySelector(this.config.selector);

    // TODO: fail if the target is invalid

    target.innerHTML = `
      <div class="${this.classList()}">
        <iframe
          src="${this.url()}"
          border="0"
          frameborder="0"
          allowtransparency="true"
          scrolling="no">
        </iframe>
      </div>
    `;

    this.container = target.children[0];
    this.iframe = this.container.children[0];
    this.window = this.iframe.contentWindow;

    this.iframe.style.height = '100%';
    this.iframe.style.width = '100%';
    this.iframe.style.background = 'transparent';
  }

  update () {
    this.container.className = this.classList();
  }

  focus (body) {
    if (body.type !== this.config.type) return;
    this.isFocused = true;
    this.update();
  }

  blur (body) {
    if (body.type !== this.config.type) return;
    this.isFocused = false;
    this.update();
  }

  change (body) {
    if (body.type !== this.config.type) return;
    this.update();
  }

  classList () {
    const prefix = 'recurly-hosted-field';
    let classes = [prefix];

    classes.push(`${prefix}-${this.config.type}`);
    if (this.isFocused) {
      classes.push(`${prefix}-focus`);
      classes.push(`${prefix}-${this.config.type}-focus`);
    }

    return classes.join(' ');
  }

  url () {
    let config = encodeURIComponent(JSON.stringify(this.config));
    return `${this.config.recurly.api}/field?config=${config}`;
  }
}
