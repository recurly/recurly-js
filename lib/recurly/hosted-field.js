import Emitter from 'component-emitter';
import clone from 'component-clone';
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

    this.focus = this.focus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onFocus = this.onFocus.bind(this);

    this.isFocused = false;
    this.configure(options);
    this.inject();
    this.bindDeferredFocus();

    this.on('bus:added', bus => {
      this.bus = bus;
      this.bus.add(this.window);
    });

    // TODO: need these to be specific to this instance
    this.on('hostedField:focus', this.onFocus.bind(this));
    this.on('hostedField:blur', this.onBlur.bind(this));
    this.on('hostedField:change', this.onChange.bind(this));
  }

  get type () {
    return this.config.type;
  }

  get url () {
    let config = encodeURIComponent(JSON.stringify(this.config));
    return `${this.config.recurly.api}/field.html#config=${config}`;
  }

  get classList () {
    const prefix = 'recurly-hosted-field';
    let classes = [prefix];

    classes.push(`${prefix}-${this.config.type}`);
    if (this.isFocused) {
      classes.push(`${prefix}-focus`);
      classes.push(`${prefix}-${this.config.type}-focus`);
    }

    return classes.join(' ');
  }

  /**
   * Checks that the elements necessary to display the hostedField are in the document.body
   *
   * @return {Boolean}
   */
  integrityCheck () {
    const els = [this.target, this.container, this.iframe];
    const present = document.body.contains.bind(document.body);
    return !~els.map(present).indexOf(false);
  }

  // Private

  configure (options) {
    options = clone(options);
    this.target = dom.element(global.document.querySelector(options.selector));
    if (!this.target) {
      const {type, selector} = options;
      throw errors('missing-hosted-field-target', { type, selector });
    }
    this.config = options;
  }

  inject () {
    const hostedDiv = `
      <div class="${this.classList}">
      </div>
    `;

    const hostedIframe = `
      <iframe
        src="${this.url}"
        border="0"
        frameborder="0"
        allowtransparency="true"
        scrolling="no">
      </iframe>
    `;

    this.hiddenInputProxy = dom.createHiddenInput({'data-hidden-input-proxy': this.config.type});
    this.target.innerHTML = hostedDiv;

    this.target.children[0].insertAdjacentElement('afterbegin', this.hiddenInputProxy);
    this.target.children[0].children[0].insertAdjacentHTML('afterend', hostedIframe);

    this.container = this.target.children[0]; // recurly-hosted-field
    this.iframe = this.container.children[1]; // iframe
    this.window = this.iframe.contentWindow;

    this.iframe.style.height = '100%';
    this.iframe.style.width = '100%';
    this.iframe.style.background = 'transparent';
  }

  bindDeferredFocus () {
    this.container.addEventListener('click', this.focus);
    if (!this.target.id) return;
    const labels = global.document.querySelectorAll(`label[for=${this.target.id}]`);
    [].slice.apply(labels).forEach(label => {
      label.addEventListener('click', this.focus);
    });
  }

  reset () {
    this.off();
    this.target.innerHTML = '';
    delete this.target;
    delete this.iframe;
    delete this.window;
  }

  update () {
    this.container.className = this.classList;
  }

  onFocus (body) {
    if (body.type !== this.type) return;
    this.isFocused = true;
    this.update();
  }

  onBlur (body) {
    if (body.type !== this.type) return;
    this.isFocused = false;
    this.update();
  }

  onChange (body) {
    if (body.type !== this.type) return;
    this.update();
  }

  focus () {
    if (!this.bus) return;
    this.bus.send(`hostedField:${this.type}:focus!`);
  }
}
