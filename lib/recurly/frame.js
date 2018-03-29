import qs from 'qs';
import Emitter from 'component-emitter';
import uuid from '../util/uuid';
import errors from '../errors';

const debug = require('debug')('recurly:frame');

const DEFAULTS = {
  width: 450,
  height: 535
};

export function factory (options) {
  options = Object.assign({}, options, { recurly: this });
  return new Frame(options);
}

/**
 * Issues an API request to a popup window.
 *
 * @param {Object} options
 * @param {String} options.path
 * @param {Object} [options.payload]
 */

class Frame extends Emitter {
  constructor (options) {
    super();
    this.id = uuid();
    this.recurly = options.recurly;
    this.name = `recurly-frame-${this.recurly.id}-${this.id}`;
    this.width = options.width || DEFAULTS.width;
    this.height = options.height || DEFAULTS.height;
    this.prepare(options.path, options.payload);
    this.listen();
  }

  /**
   * Prepares window for launch
   *
   * @private
   * @param  {String} path - API path to load
   * @param  {Object} payload - Request payload
   */
  prepare (path, payload = {}) {
    debug('creating request frame');

    payload.version = this.recurly.version;
    payload.event = this.name;
    payload.key = this.recurly.config.publicKey;

    this.once(payload.event, res => {
      if (this.relay) global.document.body.removeChild(this.relay);
      if (res.error) this.emit('error', res.error);
      else this.emit('done', res)
    });

    this.url = this.recurly.url(path);
    this.url += (~this.url.indexOf('?') ? '&' : '?') + qs.stringify(payload, { encodeValuesOnly: true });
  }

  listen (done) {
    this.recurly.bus.add(this);

    // IE will not allow communication between windows;
    // thus we must create a frame relay
    if ('documentMode' in document) {
      debug('Creating relay');
      let relay = document.createElement('iframe');
      relay.width = relay.height = 0;
      relay.src = this.recurly.url('/relay');
      relay.name = `recurly-relay-${this.recurly.id}-${this.id}`;
      relay.style.display = 'none';
      relay.onload = () => this.create();
      global.document.body.appendChild(relay);
      this.relay = relay;
      debug('Created relay', relay);
    } else {
      this.create();
    }
  }

  create () {
    debug('opening frame window', this.url, this.name, this.attributes);
    global.open(this.url, this.name, this.attributes);
  }

  get attributes () {
    return `
      resizable,scrollbars,
      width=${this.width},
      height=${this.height},
      top=${this.top},
      left=${this.left}
    `;
  }

  get top () {
    const outerHeight = global.outerHeight || global.document.documentElement.clientHeight;
    const outerTop = global.screenY === null ? global.screenTop : global.screenY;

    return center(outerHeight, this.height, outerTop);
  }

  get left () {
    const outerWidth = global.outerWidth || global.document.documentElement.clientWidth;
    const outerLeft = global.screenX === null ? global.screenLeft : global.screenX;

    return center(outerWidth, this.width, outerLeft);
  }
}

function center (outer, inner, offset) {
  return (outer - inner) / 2 + offset;
}
