import deepAssign from '../../util/deep-assign';
import dom from '../../util/dom';
import Emitter from 'component-emitter';
import find from 'component-find';
import pick from 'lodash.pick';
import slug from 'to-slug-case';
import tabbable from 'tabbable';
import uid from '../../util/uid';

const debug = require('debug')('recurly:element');

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
  static DATA_ATTRIBUTE_ID = 'recurlyElementId';
  static FRAME_NAME_PREFIX = 'recurly-element--';
  static INSTANCE_REF_NAME = '__recurlyElement';
  static OPTIONS = [
    'displayIcon',
    'inputType',
    'style',
    'tabIndex'
  ];

  static supportsTokenization = false;
  static type = null;

  /**
   * Locates the first Element in a DOM tree
   *
   * @param {HTMLElement} root
   * @return {Element} First element encountered in the tree
   */
  static findElementInDOMTree (parent) {
    const { DATA_ATTRIBUTE_ID, INSTANCE_REF_NAME } = Element;
    const maybes = parent.querySelectorAll(`[data-${slug(DATA_ATTRIBUTE_ID)}]`);
    const container = find(maybes, maybe => INSTANCE_REF_NAME in maybe);
    if (container) return container[INSTANCE_REF_NAME];
  }

  constructor ({ elements, ...options }) {
    super();
    this.elements = elements;
    this.recurly = elements.recurly;
    this.bus = elements.bus;
    this.id = uid();
    this._config = {};
    this.state = {};

    this.configure(options);
    this.bus.add(this);
    this.elements.add(this);

    this.on(this.messageName('state:change'), (...args) => this.onStateChange(...args));
    this.on(this.messageName('focus'), () => this.onFocus());
    this.on(this.messageName('blur'), () => this.onBlur());
    this.on(this.messageName('tab:previous'), () => this.onTab('previous'));
    this.on(this.messageName('tab:next'), () => this.onTab('next'));
    this.on(this.messageName('submit'), () => this.onSubmit());
    this.on('destroy', (...args) => this.destroy(...args));
  }

  /**
   * @private
   */
  get type () {
    return this.constructor.type;
  }

  get supportsTokenization () {
    return this.constructor.supportsTokenization;
  }

  get elementClassName () {
    return this.constructor.elementClassName;
  }

  /**
   * @private
   */
  get container () {
    if (this._container) return this._container;

    const { classList, iframe, tabProxy, id } = this;
    const { DATA_ATTRIBUTE_ID, INSTANCE_REF_NAME } = this.constructor;

    const container = this._container = document.createElement('div');
    dom.data(container, DATA_ATTRIBUTE_ID, id);
    container[INSTANCE_REF_NAME] = this;
    container.setAttribute('class', classList);
    container.appendChild(tabProxy);
    container.appendChild(iframe);
    container.addEventListener('click', () => this.focus());

    return container;
  }

  /**
   * @private
   */
  get tabProxy () {
    if (this._tabProxy) return this._tabProxy;
    const proxy = this._tabProxy = dom.createHiddenInput();
    proxy.addEventListener('focus', () => this.focus());
    return proxy;
  }

  /**
   * @private
   */
  get iframe () {
    if (this._iframe) return this._iframe;
    const { id, url } = this;
    const { FRAME_NAME_PREFIX } = this.constructor;
    const iframe = this._iframe = document.createElement('iframe');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('name', `${FRAME_NAME_PREFIX}${id}`);
    iframe.setAttribute('allowpaymentrequest', 'true');
    iframe.setAttribute('style', 'background: none; width: 100%; height: 100%;');
    iframe.src = url;
    return iframe;
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
    const config = encodeURIComponent(JSON.stringify(this.config));
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
      recurly: recurly.sanitizedConfig,
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
   * Usage
   *
   * ```
   * element.attach('#my-card-container');
   * ```
   *
   * ```
   * element.attach(document.querySelector('#my-card-container'));
   * ```
   *
   * @public
   * @param  {HTMLElement|String} parent element or selector reference to the attach target
   */
  attach (parent) {
    parent = dom.element(parent);
    if (!parent) {
      throw new Error(`Invalid parent. Expected HTMLElement.`);
    }

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
    const { OPTIONS } = this.constructor;
    const newConfig = deepAssign({}, _config, pick(options, OPTIONS));
    if (JSON.stringify(_config) === JSON.stringify(newConfig)) return this;
    this._config = newConfig;
    this.update();
    return this;
  }

  /**
   * Places focus on this element
   */
  focus () {
    this.bus.send(this.messageName('focus!'));
  }

  /**
   * Updates element DOM properties to latest values
   *
   * @private
   */
  update () {
    const { bus, classList, config, id, iframe } = this;
    const tabIndex = parseInt(config.tabIndex, 10) || 0;
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

  /**
   * Provides an Array of tabbable HTMLElements in the document body,
   * excluding (Recurly) Element frames
   *
   * @private
   * @return {Array} of HTMLElements
   */
  tabbableItems () {
    const { FRAME_NAME_PREFIX } = this.constructor;
    return tabbable(window.document.body).filter(el => el.name.indexOf(FRAME_NAME_PREFIX) !== 0);
  }

  // Event handlers

  /**
   * Updates state to reflect changes signaled by the Element iframe
   *
   * @private
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

  onTab (direction) {
    const tabbableItems = this.tabbableItems();
    const pos = tabbableItems.indexOf(this.tabProxy);
    const dest = direction === 'previous' ? tabbableItems[pos - 1] : tabbableItems[pos + 1];
    if (dest) dest.focus();
  }

  onSubmit () {
    this.emit('submit', this);
  }
}
