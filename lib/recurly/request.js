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
 * @typedef {RequestOptions}
 *
 * @property {String}   route          API route (e.g.: '/plans/my-plan')
 * @property {Object}   data           Request payload
 * @property {Function} [done]         Response callback. Signature: done(err, res)
 * @property {Boolean}  [cached=false] Whether to cache the request
 */

/**
 * Constructs and issues API requests according to
 * the Recurly /js/v1 API contract
 *
 * @param {Object} options
 * @param {Recurly} options.recurly Recurly instance
 */
export class Request {
  constructor (options) {
    this.recurly = options.recurly;
    this.cache = {};
  }

  /**
   * @type {Number} default is 60 seconds
   */
  get timeout () {
    return this.recurly.config.timeout || 60000;
  }

  /**
   * @type {String}
   */
  get key () {
    return this.recurly.config.publicKey;
  }

  /**
   * @type {String}
   */
  get version () {
    return this.recurly.isParent ? this.recurly.version : this.recurly.config.parentVersion;
  }

  /**
   * @type {String}
   */
  get deviceId () {
    return this.recurly.deviceId;
  }

  /**
   * @type {String}
   */
  get instanceId () {
    return this.recurly.id;
  }

  /**
   * @type {String}
   */
  get sessionId () {
    return this.recurly.sessionId;
  }

  /**
   * @type {Boolean}
   */
  get shouldUseXHR () {
    return !!this.recurly.config.cors;
  }

  /**
   * @type {Boolean}
   */
  get isConfigured () {
    return !!this.recurly.configured;
  }

  /**
   * Performs a GET request
   *
   * @public
   * @param {RequestOptions} options
   *
   * @return {Promise} if `done` is not passed in options
   * @return {undefined} if `done` is passed in options -- the callback will be used instead
   */
  get ({ route, data, done, cached }) {
    return this.requestWithCallback({ method: 'get', route, data, done, cached });
  }

  /**
   * Performs a POST request
   *
   * @public
   * @param {RequestOptions} options
   *
   * @return {Promise} if `done` is not passed in options
   * @return {undefined} if `done` is passed in options -- the callback will be used instead
   */
  post ({ route, data, done, cached }) {
    return this.requestWithCallback({ method: 'post', route, data, done, cached });
  }

  /**
   * Constructs a request with an optional callback resolve handler
   *
   * @private
   * @param {RequestOptions} options
   * @param {String}         options.method 'get' or 'post'
   *
   * @return {Promise} if `done` is not passed in options
   * @return {undefined} if `done` is passed in options -- the callback will be used instead
   */
  requestWithCallback ({ method, route, data, done, cached = false }) {
    const request = this[cached ? 'cached' : 'request']({ method, route, data });

    if (done) {
      return request.done(
        res => done(null, res),
        err => done(err, null)
      );
    }

    return request;
  }

  /**
   * Issues an API request
   *
   * @public
   * @param {String} method
   * @param {String} route
   * @param {Object} [data]
   * @throws {Error} If `configure` has not been called.
   *
   * @return {Promise}
   */
  request ({ method, route, data = {} }) {
    debug('request', method, route, data);

    if (!this.isConfigured) {
      return Promise.reject(errors('not-configured'));
    }

    const { version, key, deviceId, sessionId, instanceId } = this;
    const url = this.recurly.url(route);

    data = deepAssign({}, data, { version, key, deviceId, sessionId, instanceId });

    if (this.shouldUseXHR) {
      return this.xhr({ method, url, data });
    } else {
      return this.jsonp({ method, url, data });
    }
  }

  /**
   * Performs an API request with caching
   */
  cached ({ method, route, data }) {
    let { cache } = this;
    const slug = `${method}-${route}-${JSON.stringify(data)}`;
    if (cache[slug]) return Promise.resolve(cache[slug]);
    return this.request({ method, route, data }).then(res => cache[slug] = res);
  }

  /**
   * Performs an API request that queues until it is able to be sent
   */
  queued (...args) {
    if (this.isConfigured) return this.request(...args);
    return new Promise((resolve, reject) => {
      this.recurly.once('configured', () => this.request(...args).then(resolve, reject));
    });
  }

  /**
   * Pipelines a request across several requests
   *
   * Chunks are made of `data[by]` in `size`. If any request errors,
   * the entire pipeline errors
   *
   * - Ignores individual 404s
   * - Rejects if all responses are 404s
   * - Immediately rejects other errors
   * - Collects and concats array responses
   * - Resolves non-array responses with the first response
   *
   * @param {String} method
   * @param {String} route
   * @param {Object} data
   * @param {Array} data.by must be an Array
   * @param {String} by
   * @param {Number} size=100
   * @return {Promise}
   */
  piped ({ method = 'get', route, data = {}, by, size = 100 }) {
    const chunks = chunk(data[by], size).map(piece => {
      return Object.assign({}, data, { [by]: piece });
    });

    if (chunks.length === 0) {
      return this.request({ method, route, data });
    }

    const ignoreNotfound = error => (error.code === 'not-found' ? { error } : Promise.reject(error));
    const pipeline = chunks.map(data => this.request({ method, route, data }).catch(ignoreNotfound));

    return Promise.all(pipeline).then(results => {
      const successes = results.filter(res => !res.error);

      if (successes.length === 0) {
        return Promise.reject(results[0].error);
      }

      // Determines if any single success response is not an Array.
      // If so, we resolve with that single response
      const nonArraySuccess = successes.filter(res => !Array.isArray(res))[0];
      if (nonArraySuccess) return Promise.resolve(nonArraySuccess);

      // If we are left entirely with successful Array responses, resolve
      // with a concatenated Array of them all
      return Promise.resolve(successes.reduce((acc, cur) => acc.concat(cur)));
    });
  }

  /**
   * Issues an API request over xhr.
   *
   * @private
   * @param {String} method
   * @param {String} url
   * @param {Object} [data]
   * @return {Promise}
   */
  xhr ({ method, url, data }) {
    const error = (...args) => this.recurly.error(...args);

    return new Promise((resolve, reject) => {
      let req = new XHR;
      const payload = qs.stringify(data, { encodeValuesOnly: true });
      const { timeout } = this;

      if (method === 'get') {
        url += `?${payload}`;
      }

      req.open(method, url);
      req.timeout = timeout;
      req.ontimeout = () => reject(error('api-timeout'));
      req.onerror = () => reject(error('api-error'));
      req.onprogress = NOOP;
      req.onload = function () {
        let res;
        try {
          if (this.responseText) res = JSON.parse(this.responseText);
        } catch (e) {
          debug(e, this.responseText);
          return reject(error('api-error', {
            message: `There was a problem parsing the API response.
              request:
                url: ${method} ${url}
                body: ${data}
              response:
                body: ${this.responseText}`
          }));
        }

        if (res && res.error) {
          reject(error('api-error', res.error));
        } else {
          resolve(res);
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
    });
  }

  /**
   * Issues an API request over jsonp.
   *
   * @private
   * @param {String} method
   * @param {String} url
   * @param {Object} [data]
   */
  jsonp ({ method, url, data }) {
    const { timeout, recurly } = this;

    if (method === 'post') data._method = method;
    url += `?${qs.stringify(data, { encodeValuesOnly: true })}`;

    return new Promise((resolve, reject) => {
      jsonp(url, { prefix: '__rjs', timeout }, function (err, res) {
        if (err) return reject(err);
        if (res.error) {
          reject(recurly.error('api-error', res.error));
        } else {
          resolve(res);
        }
      });
    });
  }
}
