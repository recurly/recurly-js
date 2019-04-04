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
 * TODO:
 *  - Add focus! support
 *  - Add tabbing support
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
    this._config = {};
    this._state = {};

    this.configure(options);
    this.bus.add(this);
    this.elements.add(this);

    this.on(this.messageName('state:change'), (...args) => this.onStateChange(...args));
    this.on(this.messageName('focus'), (...args) => this.onFocus(...args));
    this.on(this.messageName('blur'), (...args) => this.onBlur(...args));
    this.on(this.messageName('submit'), (...args) => this.onSubmit(...args));
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

  /**
   * @private
   */
  get container () {
    if (this._container) return this._container;
    const { classList, iframe } = this;
    const _container = this._container = document.createElement('div');
    _container.setAttribute('class', classList);
    _container.appendChild(iframe);
    return _container;
  }

  /**
   * @private
   */
  get iframe () {
    if (this._iframe) return this._iframe;
    const { id, url } = this;
    const _iframe = this._iframe = document.createElement('iframe');
    _iframe.setAttribute('allowtransparency', 'true');
    _iframe.setAttribute('frameborder', '0');
    _iframe.setAttribute('scrolling', 'no');
    _iframe.setAttribute('name', `recurly-element--${id}`);
    _iframe.setAttribute('allowpaymentrequest', 'true');
    _iframe.setAttribute('style', 'background: transparent; width: 100%; height: 100%;');
    _iframe.src = url;
    return _iframe;
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
   * Whether this instance has begun attachment but is awaiting the 'ready' message
   *
   * @public
   */
  get attaching () {
    return this.hasListeners(this.messageName('ready'));
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
    const { bus, id, recurly, type } = this;
    const { deviceId, sessionId } = recurly;
    return {
      ...this._config,
      busGroupId: bus.groupId,
      deviceId,
      elementId: id,
      recurly: recurly.config,
      sessionId,
      type
    };
  }

  /**
   * Provides a string of class names corresponding to
   * the current state
   *
   * @private
   */
  get classList () {
    const { attached, state, type } = this;
    const prefix = 'recurly-element';
    let classes = [prefix];

    if (attached) {
      classes.push(`${prefix}-${type}`);
      if (state.focus) {
        classes.push(`${prefix}-focus`);
        classes.push(`${prefix}-${type}-focus`);
      }

      if (state.valid) {
        classes.push(`${prefix}-valid`);
        classes.push(`${prefix}-${type}-valid`);
      } else if (!state.focus && !state.empty) {
        classes.push(`${prefix}-invalid`);
        classes.push(`${prefix}-${type}-invalid`);
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
    const { attached, bus, container } = this;
    if (attached) {
      if (container.parentElement === parent) return this;
      this.remove();
    }
    parent.appendChild(container);
    bus.add(this.window);
    this.once(this.messageName('ready'), () => this.emit('attach', this));
    return this;
  }

  /**
   * Removes the element from the DOM
   *
   * @public
   */
  remove () {
    const { attached, bus, id, container } = this;
    if (!attached) return this;
    const parent = container.parentElement;
    if (!parent) return this;
    bus.remove(this.window);
    parent.removeChild(container);
    // Prevent dangling ready listeners from triggering the 'attach' event
    this.off(this.messageName('ready'));
    this.emit('remove', this);
    return this;
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
    return this;
  }

  /**
   * Configures the element, enforcing the config whitelist
   *
   * @public
   */
  configure (options = {}) {
    const { _config } = this;
    const newConfig = { ..._config, ...pick(options, OPTIONS) };
    if (JSON.stringify(_config) === JSON.stringify(newConfig)) return this;
    this._config = newConfig;
    this.update();
    return this;
  }

  /**
   * Updates element DOM properties to latest values
   *
   * @private
   */
  update () {
    const { bus, classList, config, id, iframe, tabIndex } = this;
    this.container.className = classList;
    iframe.setAttribute('tabindex', tabIndex);
    bus.send(this.messageName('configure!'), config);
  }

  /**
   * Builds a standard message name string in the format expected from
   * a frame message
   *
   * @private
   * @param {string} name message name
   * @return {String} fully qualified message name
   */
  messageName (name) {
    return `element:${this.id}:${name}`;
  }

  // Event handlers

  /**
   * Updates state to reflect changes signaled by the Element iframe
   *
   * @param  {Object} body message body, containing new state
   */
  onStateChange (body) {
    let newState = { ...body };
    delete newState.type;
    if (JSON.stringify(this.state) === JSON.stringify(newState)) return;
    this.state = newState;
    this.emit('change', { ...this.state });
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
