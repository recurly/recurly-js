import Promise from 'promise';
import loadScriptPromise from '../util/load-script-promise';

const debug = require('debug')('recurly:engage');

/**
 * Options for Engage
 *
 * @typedef {Object} EngageOptions
 * @property {Recurly} recurly
 */

/**
 * Engage
 *
 * @param {EngageOptions} options
 */
export class Engage {
  static loadScriptPromise = loadScriptPromise;

  constructor ({ recurly }) {
    this.recurly = recurly;
    recurly.ready(() => this.load());
  }

  get enabled () {
    return !!this.recurly.config.engage.enabled;
  }

  get appId () {
    if (this.recurly.config.engage.appId) {
      return Promise.resolve(this.recurly.config.engage.appId);
    }

    return this.recurly.request.get({ route: '/engage/settings' }).then(({ app_id }) => app_id);
  }

  /**
   * Loads Engage
   *
   * @return {Promise}
   */
  async load () {
    if (!this.enabled) {
      debug('Engage disabled');
      return;
    }

    if ('Redfast' in window) {
      debug('Engage discovered');
      return;
    }

    debug('loading Engage');

    try {
      const appId = await this.appId;

      return await this.constructor.loadScriptPromise(`https://${appId}.redfastlabs.com/assets/redfast.js`);
    } catch (error) {
      debug('Error encountered while loading Engage', error);
    }
  }
}
