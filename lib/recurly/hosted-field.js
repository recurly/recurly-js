import Emitter from 'component-emitter';
import dom from '../util/dom';
import errors from '../errors';

const debug = require('debug')('recurly:hostedField');

/**
 * HostedField
 *
 * @constructor
 * @param {Object} options
 * @param {String} options.selector target selector
 * @private
 */

export class HostedField extends Emitter {
  constructor (options) {
    super();
    this.isFocused = false;
    this.configure(options);
    this.inject();
    // TODO: need this to be specific to this instance
    this.on('hostedField:focus', this.focus.bind(this));
    this.on('hostedField:blur', this.blur.bind(this));
    this.on('hostedField:change', this.change.bind(this));
  }

  configure (options) {
    this.target = dom.element(window.document.querySelector(options.selector));
    if (!this.target) {
      const {type, selector} = options;
      throw errors('missing-hosted-field-target', { type, selector });
    }
    this.config = options;
  }

  inject () {
    this.target.innerHTML = `
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

    this.container = this.target.children[0];
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
