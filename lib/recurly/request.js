import chunk from 'lodash.chunk';
import deepAssign from '../util/deep-assign';
import errors from './errors';
import jsonp from 'jsonp';
import Promise from 'promise';
import qs from 'qs';

const debug = require('debug')('recurly:Request');

/**
 * XHR/XDM Reference, according to browser environment
 */
const XHR = (() => {
  const XHR = window.XMLHttpRequest;
  const XDM = window.XDomainRequest;
  if (XHR && 'withCredentials' in new XHR) return XHR;
  if (XDM) return XDM;
})();

const NOOP = () => {};

/**
 * Constructs and issues API requests according to
 * the Recurly /js/v1 API contract
 *
 * TODO: adapt ALL request, pipedRequest, and cachedRequest calls
 *       to new patterns
 *
 * @param {Object} options
 * @param {Recurly} options.recurly Recurly instance
 */
export class Request {
  constructor (options) {
    this.recurly = options.recurly;
    this.cache = {};

    this.queue = [];
    this.recurly.once('configured', args => {
      this.queue.forEach(args => this.request(...args));
      this.queue = [];
    });
  }

  get timeout () {
    return this.recurly.config.timeout || 60000;
  }

  get key () {
    return this.recurly.config.publicKey;
  }

  get version () {
    return this.recurly.isParent ? this.recurly.version : this.recurly.config.parentVersion;
  }

  get deviceId () {
    return this.recurly.deviceId;
  }

  get sessionId () {
    return this.recurly.sessionId;
  }

  get shouldUseXHR () {
    return !!this.recurly.config.cors;
  }

  get isConfigured () {
    return !!this.recurly.configured;
  }

  get ({ route, data, done, cached = false }) {
    return this[cached ? 'cached' : 'request']({ method: 'get', route, data }, done);
  }

  post ({ route, data, done, cached = false }) {
    return this[cached ? 'cached' : 'request']({ method: 'post', route, data }, done);
  }

  /**
   * Issues an API request
   *
   * @param {String} method
   * @param {String} route
   * @param {Object} [data]
   * @param {Function} done
   * @throws {Error} If `configure` has not been called.
   * @private
   */
  request ({ method, route, data = {} }, done = NOOP) {
    debug('request', method, route, data);

    if (!this.isConfigured) {
      throw errors('not-configured');
    }

    const { version, key, deviceId, sessionId, timeout } = this;
    const url = this.recurly.url(route);

    data = deepAssign({}, data, { version, key, deviceId, sessionId });

    if (this.shouldUseXHR) {
      return this.xhr({ method, url, data, done, timeout });
    } else {
      return this.jsonp({ url, data, done, timeout });
    }
  }

  /**
   * Performs an API request with caching
   */
  cached ({ method, route, data }, done = NOOP) {
    let { cache } = this;
    const slug = `${method}-${route}-${JSON.stringify(data)}`;
    if (cache[slug]) return done(null, ...cache[slug]);
    this.request({ method, route, data }, (err, ...args) => {
      if (!err) cache[slug] = args;
      done(err, ...args);
    });
  }

  /**
   * Performs an API request that queues until it is able to be sent
   */
  queued (...args) {
    if (this.isConfigured) {
      this.request(...args);
    } else {
      this.queue.push(args);
    }
  }

  /**
   * Pipelines a request across several requests
   *
   * Chunks are made of `data[by]`` in `size`. If any request errors,
   * the entire pipeline errors
   *
   * - Ignores 404s until done
   * - Immediately rejects other errors
   * - Collects and concats array responses
   * - Immediately resolves non-array responses
   *
   * @param {String} method
   * @param {String} route
   * @param {Object} data
   * @param {Array} data.by must be an Array
   * @param {String} by
   * @param {Number} size=100
   * @param {Function} done
   * @return {Promise}
   */
  piped ({ method = 'get', route, data = {}, by, size = 100 }) {
    let results = [];
    let empties = [];

    const chunks = chunk(data[by], size).map(piece => {
      return Object.assign({}, data, { [by]: piece });
    });

    if (chunks.length === 0) {
      return Promise.denodeify(this.request.bind(this))({ method, route, data });
    }

    return new Promise((resolve, reject) => {
      const part = (err, res) => {
        // if we have any errors that are not 404, reject
        if (err) {
          if (err.code === 'not-found') empties.push(err);
          else return reject(err);
        }

        // If the response is an array, collect it; otherwise, resolve with it
        if (res) {
          if (Array.isArray(res)) results.push(res);
          else return resolve(res);
        }

        if ((results.length + empties.length) === chunks.length) {
          // if we have some results and some 404s, resolve with results
          // otherwise, reject with the first 404
          if (results.length > 0) resolve(results.reduce((acc, cur) => acc.concat(cur)));
          else reject(empties[0]);
        }
      };

      chunks.forEach(data => this.request({ method, route, data }, part));
    });
  }

  /**
   * Issues an API request over xhr.
   *
   * @param {String} method
   * @param {String} url
   * @param {Object} [data]
   * @param {Function} done
   * @private
   */
  xhr ({ method, url, data, done, timeout }) {
    let req = new XHR;
    const payload = qs.stringify(data, { encodeValuesOnly: true });

    if (method === 'get') {
      url += `?${payload}`;
    }

    req.open(method, url);
    req.timeout = timeout;
    req.ontimeout = () => done(errors('api-timeout'));
    req.onerror = () => done(errors('api-error'));
    req.onprogress = NOOP;
    req.onload = function () {
      let res;
      try {
        res = JSON.parse(this.responseText);
      } catch (e) {
        debug(e, this.responseText);
        return done(errors('api-error', {
          message: `There was a problem parsing the API response with: ${this.responseText}`
        }));
      }

      if (res && res.error) {
        done(errors('api-error', res.error));
      } else {
        done(null, res);
      }
    };

    // XDR requests will abort if too many are sent simultaneously
    setTimeout(() => {
      if (method === 'post') {
        // XDR cannot set Content-type
        if (req.setRequestHeader) {
          req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        }
        req.send(payload);
      } else {
        req.send();
      }
    }, 0);
  }

  /**
   * Issues an API request over jsonp.
   *
   * @param {String} url
   * @param {Object} [data]
   * @param {Function} done
   * @param {Number} timeout
   * @private
   */
  jsonp ({ url, data, done, timeout }) {
    url += `?${qs.stringify(data, { encodeValuesOnly: true })}`;

    jsonp(url, { prefix: '__rjs', timeout }, function (err, res) {
      if (err) return done(err);
      if (res.error) {
        done(errors('api-error', res.error));
      } else {
        done(null, res);
      }
    });
  }
}
