import clone from 'component-clone';
import deepAssign from '../../util/deep-assign';
import dom from '../../util/dom';
import pick from 'lodash.pick';
import Emitter from 'component-emitter';
import uuid from 'uuid/v4';

const debug = require('debug')('recurly:element');

export const OPTIONS = [
  'displayIcon',
  'inputType',
  'style',
  'tabIndex'
];

/**
 * Element
 *
 * Controller for a DOM element that accepts protected customer data
 *
 * @param  {Object} options
 * @param  {Elements} options.elements
 * @return {Element}
 */
export default class Element extends Emitter {
  static TYPE = null;

  constructor ({ elements, ...options }) {
    super();
    this.elements = elements;
    this.recurly = elements.recurly;
    this.bus = elements.bus;
    this.id = uuid();
    this.ready = false;
    this._state = {};

    this.configure(options);
    this.bus.add(this);
    this.elements.add(this);

    const prefix = `element:${this.id}`;
    this.on(`${prefix}:ready`, (...args) => this.onReady(...args));
    this.on(`${prefix}:state:change`, (...args) => this.onStateChange(...args));
    this.on(`${prefix}:focus`, (...args) => this.onFocus(...args));
    this.on(`${prefix}:blur`, (...args) => this.onBlur(...args));
    this.on(`${prefix}:submit`, (...args) => this.onSubmit(...args));
    this.on('destroy', (...args) => this.destroy(...args));
  }

  /**
   * @private
   */
  get type () {
    return this.constructor.TYPE;
  }

  /**
   * @private
   */
  get state () {
    return this._state;
  }

  set state (newState) {
    if (JSON.stringify(this._state) === JSON.stringify(newState)) return;
    this._state = newState;
    this.emit('change', clone(this._state));
  }

  /**
   * @private
   */
  get container () {
    if (this._container) return this._container;
    const container = this._container = document.createElement('div');
    container.setAttribute('class', this.classList);
    container.appendChild(this.iframe);
    return this._container;
  }

  /**
   * @private
   */
  get iframe () {
    if (this._iframe) return this._iframe;
    const iframe = this._iframe = document.createElement('iframe');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('name', `recurly-element--${this.id}`);
    iframe.setAttribute('allowpaymentrequest', 'true');
    iframe.setAttribute('style', 'background: transparent; width: 100%; height: 100%;');
    iframe.src = this.url;
    return this._iframe;
  }

  /**
   * @private
   */
  get window () {
    return this.iframe.contentWindow;
  }

  /**
   * @private
   */
  get attached () {
    return !!this.window;
  }

  /**
   * @private
   */
  get url () {
    let config = encodeURIComponent(JSON.stringify(this.config));
    return this.recurly.url(`/field.html#config=${config}`);
  }

  /**
   * @private
   */
  get config () {
    const { deviceId, sessionId } = this.recurly;
    return deepAssign({}, this._config, {
      deviceId,
      sessionId,
      busGroupId: this.bus.groupId,
      elementId: this.id,
      recurly: this.recurly.config,
      type: this.type
    });
  }

  /**
   * @private
   */
  get classList () {
    const prefix = 'recurly-element';
    let classes = [prefix];

    if (this.ready) {
      classes.push(`${prefix}-${this.type}`);
      if (this.state.focus) {
        classes.push(`${prefix}-focus`);
        classes.push(`${prefix}-${this.type}-focus`);
      }

      if (this.state.valid) {
        classes.push(`${prefix}-valid`);
        classes.push(`${prefix}-${this.type}-valid`);
      } else if (!this.state.focus && !this.state.empty) {
        classes.push(`${prefix}-invalid`);
        classes.push(`${prefix}-${this.type}-invalid`);
      }
    }

    return classes.join(' ');
  }

  /**
   * Attach the element to an HTMLElement
   *
   * @public
   * @param  {HTMLElement} parent
   */
  attach (parent) {
    parent = dom.element(parent);
    if (!parent) throw new Error(`Invalid parent. Expected HTMLElement.`);
    if (this.attached) {
      if (this.container.parentElement === parent) return;
      this.remove();
    }
    parent.appendChild(this.container);
    this.bus.add(this.window);
    this.on(`element:${this.id}:ready`, () => this.emit('attach', this));
  }

  /**
   * Removes the element from the DOM
   *
   * @public
   */
  remove () {
    if (!this.attached) return;
    const parent = this.container.parentElement;
    if (!parent) return;
    this.bus.remove(this.window);
    parent.removeChild(this.container);
    this.emit('remove', this);
  }

  /**
   * Destroys the element and disables its functionality
   *
   * @public
   */
  destroy () {
    this.remove();
    this.off();
    this.bus.remove(this);
    this.elements.remove(this);
    delete this.container;
    delete this.iframe;
    delete this.window;
  }

  /**
   * Configures the element, enforcing the config whitelist
   *
   * @public
   */
  configure (options = {}) {
    if (!this._config) this._config = {};
    const newConfig = Object.assign({}, this._config, pick(options, OPTIONS));
    if (JSON.stringify(this._config) === JSON.stringify(newConfig)) return;
    this._config = newConfig;
    this.update();
  }

  /**
   * Updates element DOM properties to latest values
   *
   * @private
   */
  update () {
    this.container.className = this.classList;
    this.iframe.setAttribute('tabindex', this.tabIndex);
    this.bus.send(`element:${this.id}:configure!`, this.config);
  }

  // Event handlers

  onReady () {
    this.ready = true;
    this.off(`element:${this.id}:ready`, this.onReady);
    this.update();
    this.emit('ready', this);
  }

  /**
   * Updates state to reflect changes signaled by the Element iframe
   *
   * @param  {Object} body message body, containing new state
   */
  onStateChange (body) {
    let newState = clone(body);
    delete newState.type;
    this.state = newState;
    this.update();
  }

  onFocus () {
    this.emit('focus', this);
  }

  onBlur () {
    this.emit('blur', this);
  }

  onSubmit () {
    this.emit('submit', this);
  }
}
