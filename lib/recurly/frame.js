import qs from 'qs';
import Emitter from 'component-emitter';
import uid from '../util/uid';

const debug = require('debug')('recurly:frame');

/**
 * Options for Frame
 *
 * @typedef {Object} FrameOptions
 * @property {Recurly} recurly
 * @property {String} path            API endpoint to load
 * @property {Object} payload         Message payload to deliver to endpoint
 * @property {TYPE} [type=Frame.TYPES.WINDOW]          window or iframe
 * @property {HTMLElement} container  only valid for type='iframe' --
 *                                      attaches iframe to this container
 * @property {Number} [height=450]    frame height
 * @property {Number} [width=535]     frame width
 */

/**
 * Frame factory. Binds the caller to the `recurly` {FrameOptions} property
 *
 * @public
 * @param {FrameOptions} options
 *
 * @return {Frame}
 */
export function factory (options) {
  options = Object.assign({}, options, { recurly: this });
  return new Frame(options);
}

/**
 * Issues an API request to a popup window.
 *
 * @param {FrameOptions} options
 */
export class Frame extends Emitter {
  static TYPES = {
    WINDOW: 0,
    IFRAME: 1
  };

  static DEFAULTS = {
    height: 535,
    width: 450,
    type: Frame.TYPES.WINDOW
  };

  static DIMENSIONS = {
    '01': { height: '400px', width: '250px' },
    '02': { height: '400px', width: '390px' },
    '03': { height: '600px', width: '500px' },
    '04': { height: '400px', width: '600px' },
    '05': { height: '100%', width: '100%' }
  }

  constructor ({ recurly, path, payload = {}, ...options }) {
    super();
    this.recurly = recurly;
    this.id = `${this.recurly.id}-${uid()}`;
    this.name = `recurly-frame-${this.id}`;
    this.config = options;
    this.prepare(path, payload);
    this.listen();
  }

  /**
   * Whether this Frame is to be rendered as an iframe
   * @type {Boolean}
   */
  get isIframe () {
    return this.type === Frame.TYPES.IFRAME;
  }

  /**
   * Default event name to listen for.
   */
  get defaultEventName () {
    return this.config.defaultEventName;
  }

  /**
   * Frame height from configuration
   * @type {Number}
   */
  get height () {
    return this.config.height || this.constructor.DEFAULTS.height;
  }

  /**
   * Frame width from configuration
   * @type {Number}
   */
  get width () {
    return this.config.width || this.constructor.DEFAULTS.width;
  }

  /**
   * Frame type from configuration
   * @type {String}
   */
  get type () {
    return this.config.type || this.constructor.DEFAULTS.type;
  }

  /**
   * Frame container element
   * @type {HTMLElement}
   */
  get container () {
    return this.config.container;
  }

  /**
   * Idomatic list of window attributes meant for a `window.open`` call
   * @type {String}
   */
  get windowAttributes () {
    const { width, height, top, left } = this;
    return `resizable,scrollbars,width=${width},height=${height},top=${top},left=${left}`;
  }

  /**
   * Calculated window top position in order to place a new window above the center
   * of the parent viewport
   *
   * @type {Number}
   */
  get top () {
    const outerHeight = window.outerHeight || window.document.documentElement.clientHeight;
    const outerTop = window.screenY === null ? window.screenTop : window.screenY;

    return center(outerHeight, this.height, outerTop);
  }

  /**
   * Calculated window left position in order to place a new window above the center
   * of the parent viewport
   *
   * @type {Number}
   */
  get left () {
    const outerWidth = window.outerWidth || window.document.documentElement.clientWidth;
    const outerLeft = window.screenX === null ? window.screenLeft : window.screenX;

    return center(outerWidth, this.width, outerLeft);
  }

  /**
   * Prepares the url and payload prior to launching the Frame
   *
   * @private
   * @param {String} path - API path to load
   * @param {Object} payload - Request payload
   */
  prepare (path, payload) {
    const { name, recurly } = this;
    debug('creating request frame');

    payload.version = recurly.version;
    payload.event = name;
    payload.key = recurly.config.publicKey;

    const ev = res => {
      this.removeRelay();
      if (res.error) {
        this.emit('error', res.error);
      } else {
        this.emit('done', res);
      }
      this.destroy();
    };

    this.once(payload.event, ev);
    if (this.defaultEventName) {
      this.once(this.defaultEventName, ev);
    }

    this.url = this.recurly.url(path);
    this.url += (~this.url.indexOf('?') ? '&' : '?') + qs.stringify(payload, { encodeValuesOnly: true });

    this.once('destroy', () => this.destroy());
  }

  /**
   * Adds the Frame to the Bus and creates a relay if necessary
   *
   * @private
   */
  listen () {
    this.recurly.bus.add(this);

    // IE (including 11) will not allow communication between windows;
    // thus we must create a frame relay
    if ('documentMode' in document) {
      debug('creating relay');
      let relay = document.createElement('iframe');
      relay.width = relay.height = 0;
      relay.src = this.recurly.url('/relay');
      relay.name = `recurly-relay-${this.id}`;
      relay.style.display = 'none';
      relay.onload = () => this.create();
      window.document.body.appendChild(relay);
      this.relay = relay;
      debug('created relay', relay);
    } else {
      this.create();
    }
  }

  /**
   * Initiates creation of the frame
   *
   * @private
   */
  create () {
    if (this.isIframe) this.createIFrame();
    else this.createWindow();
  }

  /**
   * Creates a new window (popup)
   *
   * @private
   */
  createWindow () {
    const { name, url, windowAttributes } = this;
    this.window = window.open(url, name, windowAttributes);
    debug('opening window', this.window, url, name, windowAttributes);
    this.bindWindowCloseListener();
  }

  /**
   * Creates a new iframe
   *
   * @private
   */
  createIFrame () {
    const { container, url } = this;
    const iframe = document.createElement('iframe');
    const dimensions = this.constructor.DIMENSIONS;
    const windowSize = this.recurly.config.challengeWindowSize;

    if (!(container instanceof HTMLElement)) {
      throw new Error(`Invalid container. Expected HTMLElement, got ${typeof container}`);
    }

    iframe.src = url;
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('border', '0');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('style', `background: transparent; width: ${ dimensions[windowSize].width }; height: ${ dimensions[windowSize].height };`);
    container.appendChild(iframe);
    this.iframe = iframe;
    debug('created iframe and attached to', container);
  }

  /**
   * Destroys the frame
   *  - closes the window or removes the iframe
   *  - removes listeners
   *  - instructs instance to remove any existing relay
   *
   * @private
   */
  destroy () {
    const { iframe, window: frameWindow } = this;

    if (iframe) {
      const { parentElement } = iframe;
      if (parentElement) parentElement.removeChild(iframe);
      delete this.iframe;
    } else if (frameWindow) {
      if (frameWindow.close) frameWindow.close();
      this.removeWindowCloseListener();
    }

    this.off();
    this.removeRelay();
  }

  /**
   * Removes any existing relay
   *
   * @private
   */
  removeRelay () {
    if (!this.relay) return;
    if (!window.document.body.contains(this.relay)) return;
    window.document.body.removeChild(this.relay);
  }

  bindWindowCloseListener () {
    const tick = this.windowCloseListenerTick = setInterval(() => {
      if (!this.window) {
        return clearInterval(tick);
      }
      if (this.window.closed) {
        debug('detected frame window closure. Destroying.', this.window);
        this.emit('close');
        this.destroy();
      }
    }, 1000);
  }

  removeWindowCloseListener () {
    const { windowCloseListenerTick: tick } = this;
    if (tick) clearInterval(tick);
  }
}

/**
 * Calculates the center position given screen and window dimensions
 *
 * @param {Number} outer
 * @param {Number} inner
 * @param {Number} offset
 *
 * @return {Number} center position
 */
function center (outer, inner, offset) {
  return (outer - inner) / 2 + offset;
}
