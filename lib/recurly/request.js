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
 * @param {Object} options
 * @param {Recurly} options.recurly Recurly instance
 */
export class Request {
  constructor (options) {
    this.recurly = options.recurly;
    this.cache = {};
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

  get ({ route, data, done, cached }) {
    return this.requestWithCallback({ method: 'get', route, data, done, cached });
  }

  post ({ route, data, done, cached }) {
    return this.requestWithCallback({ method: 'post', route, data, done, cached });
  }

  requestWithCallback ({ method, route, data, done, cached = false }) {
    const request = this[cached ? 'cached' : 'request']({ method, route, data });
    if (done) return request.done(res => done(null, res), err => done(err, null));
    else return request;
  }

  /**
   * Issues an API request
   *
   * @param {String} method
   * @param {String} route
   * @param {Object} [data]
   * @throws {Error} If `configure` has not been called.
   * @return {Promise}
   * @private
   */
  request ({ method, route, data = {} }) {
    debug('request', method, route, data);

    if (!this.isConfigured) {
      return Promise.reject(errors('not-configured'));
    }

    const { version, key, deviceId, sessionId } = this;
    const url = this.recurly.url(route);

    data = deepAssign({}, data, { version, key, deviceId, sessionId });

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
      const nonArraySuccess = successes.filter(res => !Array.isArray(res))[0];
      if (successes.length === 0) return Promise.reject(results[0].error);
      else if (nonArraySuccess) return Promise.resolve(nonArraySuccess);
      else return Promise.resolve(successes.reduce((acc, cur) => acc.concat(cur)));
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
    return new Promise((resolve, reject) => {
      let req = new XHR;
      const payload = qs.stringify(data, { encodeValuesOnly: true });
      const { timeout } = this;

      if (method === 'get') {
        url += `?${payload}`;
      }

      req.open(method, url);
      req.timeout = timeout;
      req.ontimeout = () => reject(errors('api-timeout'));
      req.onerror = () => reject(errors('api-error'));
      req.onprogress = NOOP;
      req.onload = function () {
        let res;
        try {
          if (this.responseText) res = JSON.parse(this.responseText);
        } catch (e) {
          debug(e, this.responseText);
          return reject(errors('api-error', {
            message: `There was a problem parsing the API response with: ${this.responseText}`
          }));
        }

        if (res && res.error) {
          reject(errors('api-error', res.error));
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
    const { timeout } = this;

    if (method === 'post') data._method = method;
    url += `?${qs.stringify(data, { encodeValuesOnly: true })}`;

    return new Promise((resolve, reject) => {
      jsonp(url, { prefix: '__rjs', timeout }, function (err, res) {
        if (err) return reject(err);
        if (res.error) {
          reject(errors('api-error', res.error));
        } else {
          resolve(res);
        }
      });
    });
  }
}
