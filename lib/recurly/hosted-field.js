import Emitter from 'component-emitter';
import clone from 'component-clone';
import dom from '../util/dom';
import errors from './errors';

const bowser = require('bowser');
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

    this.onReady = this.onReady.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onConfigure = this.onConfigure.bind(this);
    this.onStateChange = this.onStateChange.bind(this);
    this.focus = this.focus.bind(this);
    this.destroy = this.destroy.bind(this);

    this.ready = false;
    this.state = {};
    this.configure(options);
    this.inject();
    this.bindDeferredFocus();

    this.on('bus:added', bus => {
      this.bus = bus;
      this.bus.add(this.window);
    });

    this.on('hostedField:ready', this.onReady);
    this.on('hostedField:change', this.onChange);
    this.on('hostedField:configure', this.onConfigure);
    this.on('hostedField:state:change', this.onStateChange);
    this.once('destroy', this.destroy);
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

    if (this.ready) {
      classes.push(`${prefix}-${this.config.type}`);
      if (this.state.focus) {
        classes.push(`${prefix}-focus`);
        classes.push(`${prefix}-${this.config.type}-focus`);
      }

      if (this.state.valid) {
        classes.push(`${prefix}-valid`);
        classes.push(`${prefix}-${this.config.type}-valid`);
      } else if (!this.state.focus && !this.state.empty) {
        classes.push(`${prefix}-invalid`);
        classes.push(`${prefix}-${this.config.type}-invalid`);
      }
    }

    return classes.join(' ');
  }

  get tabIndex () {
    let tabIndex = parseInt(this.config.tabIndex, 10);
    return isNaN(tabIndex) ? 0 : tabIndex;
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
    if (!this.target) this.target = dom.element(window.document.querySelector(options.selector));
    if (!this.target) {
      const { type, selector } = options;
      throw errors('missing-hosted-field-target', { type, selector });
    }
    this.config = options;
  }

  inject () {
    this.target.innerHTML = `
      <div class="${this.classList}">
        <iframe
          src="${this.url}"
          allowtransparency="true"
          border="0"
          frameborder="0"
          scrolling="no"
          style="background: transparent; width: 100%; height: 100%;">
        </iframe>
      </div>
    `;

    this.container = this.target.children[0];
    this.iframe = this.container.querySelector('iframe');
    this.window = this.iframe.contentWindow;

    // Inject mobile tabbing proxy before the iframe
    if (isMobile()) {
      this.tabbingProxy = dom.createHiddenInput();
      this.tabbingProxy.addEventListener('focus', this.focus);
      this.container.insertBefore(this.tabbingProxy, this.iframe);
    }
  }

  /**
   * Binds focus on the following elements to the `focus!` event on the hosted field
   *  - the container element
   *  - `<label>` elements with a `for` attribute matching the target `id` attribute
   *
   * @private
   */
  bindDeferredFocus () {
    this.container.addEventListener('click', this.focus);
    if (!this.target.id) return;
    const labels = window.document.querySelectorAll(`label[for=${this.target.id}]`);
    [].slice.apply(labels).forEach(label => {
      label.addEventListener('click', this.focus);
    });
  }

  /**
   * Removes listeners, and clears references
   *
   * @private
   */
  destroy () {
    debug(`destroying ${this.type} hosted field`, this);
    this.off();
    if (this.bus) this.bus.remove(this);
    if (this.target) this.target.innerHTML = '';
    delete this.target;
    delete this.container;
    delete this.iframe;
    delete this.window;
  }

  update () {
    this.container.className = this.classList;
    this.iframe.setAttribute('tabindex', this.tabIndex);
  }

  onReady (body) {
    if (body.type !== this.type) return;
    this.ready = true;
    this.off('hostedField:ready', this.onReady);
    this.update();
  }

  onStateChange (body) {
    if (body.type !== this.type) return;
    let newState = Object.assign({}, body);
    delete newState.type;
    this.state = newState;
    this.update();
  }

  onChange (body) {
    if (body.type !== this.type) return;
    this.update();
  }

  onConfigure (body) {
    if (body.type !== this.type) return;
    this.configure(body);
    this.update();
  }

  /**
   * Places focus on this hosted field
   */
  focus () {
    if (!this.bus) return;
    this.bus.send(`hostedField:${this.type}:focus!`);
  }
}

/**
 * Determine if user's browser is mobile or non-mobile
 * @return {Boolean} value
 */

function isMobile () {
  return bowser.mobile || bowser.tablet;
}
