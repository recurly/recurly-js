import qs from 'qs';
import Emitter from 'component-emitter';
import uuid from 'uuid/v4';

const debug = require('debug')('recurly:frame');

export function factory (options) {
  options = Object.assign({}, options, { recurly: this });
  return new Frame(options);
}

/**
 * Issues an API request to a popup window.
 *
 * @param {Recurly} recurly
 * @param {String} path API endpoint to load
 * @param {Object} payload Message payload to deliver to endpoint
 * @param {String} [type='window'] one of 'window' or 'iframe'
 * @param {HTMLElement} container only valid for type='iframe' --
 *                                attaches iframe to this container
 * @param {Number} [height=450] frame height
 * @param {Number} [width=535] frame width
 */

class Frame extends Emitter {
  static DEFAULTS = {
    height: 535,
    width: 450,
    type: 'window'
  };

  constructor ({ recurly, path, payload = {}, ...options }) {
    super();
    this.recurly = recurly;
    this.id = `${this.recurly.id.split('-')[0]}-${uuid().split('-')[0]}`;
    this.name = `recurly-frame-${this.id}`;
    this.config = options;
    this.prepare(path, payload);
    this.listen();
  }

  get isIframe () {
    return this.type === 'iframe';
  }

  get height () {
    return this.config.height || this.constructor.DEFAULTS.height;
  }

  get width () {
    return this.config.width || this.constructor.DEFAULTS.width;
  }

  get type () {
    return this.config.type || this.constructor.DEFAULTS.type;
  }

  get container () {
    return this.config.container;
  }

  /**
   * Prepares window for launch
   *
   * @private
   */
  prepare (path, payload) {
    const { name, recurly } = this;
    debug('creating request frame');

    payload.version = recurly.version;
    payload.event = name;
    payload.key = recurly.config.publicKey;

    this.once(payload.event, res => {
      this.removeRelay();
      if (res.error) this.emit('error', res.error);
      else this.emit('done', res);
      if (this.isIframe) this.destroy();
    });

    this.url = this.recurly.url(path);
    this.url += (~this.url.indexOf('?') ? '&' : '?') + qs.stringify(payload, { encodeValuesOnly: true });

    this.once('destroy', () => this.destroy());
  }

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

  create () {
    if (this.isIframe) this.createIFrame();
    else this.createWindow();
  }

  createWindow () {
    const { name, url, windowAttributes } = this;
    this.window = window.open(url, name, windowAttributes);
    debug(`opening window`, this.window, url, name, windowAttributes);
  }

  createIFrame () {
    const { container, iframeAttributes, name, url } = this;
    const iframe = document.createElement('iframe');

    if (!(container instanceof HTMLElement)) {
      throw new Error(`Invalid container. Expected HTMLElement, got ${typeof container}`);
    }

    iframe.src = url;
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('border', '0');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('style', 'background: transparent; width: 100%; height: 100%;');
    container.appendChild(iframe);
    this.iframe = iframe;
    debug('created iframe and attached to', container);
  }

  destroy () {
    const { iframe } = this;
    if (this.window) {
      this.window.close();
    } else if (iframe) {
      const { parentElement } = iframe;
      if (parentElement) parentElement.removeChild(iframe);
      delete this.iframe;
    }
    this.off();
    this.removeRelay();
  }

  removeRelay () {
    if (!this.relay) return;
    window.document.body.removeChild(this.relay);
  }

  get windowAttributes () {
    const { width, height, top, left } = this;
    return `resizable,scrollbars,width=${width},height=${height},top=${top},left=${left}`;
  }

  get top () {
    const outerHeight = window.outerHeight || window.document.documentElement.clientHeight;
    const outerTop = window.screenY === null ? window.screenTop : window.screenY;

    return center(outerHeight, this.height, outerTop);
  }

  get left () {
    const outerWidth = window.outerWidth || window.document.documentElement.clientWidth;
    const outerLeft = window.screenX === null ? window.screenLeft : window.screenX;

    return center(outerWidth, this.width, outerLeft);
  }
}

function center (outer, inner, offset) {
  return (outer - inner) / 2 + offset;
}
