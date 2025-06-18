import loadScriptPromise from '../util/load-script-promise';

const debug = require('debug')('recurly:engage');

/**
 * Loads Engage
 */
export class Engage {
  static loadScriptPromise = loadScriptPromise;

  constructor () {
    if ('Redfast' in window) {
      debug('Engage discovered');
    } else {
      debug('loading Engage');
      this.constructor.loadScriptPromise(`https://conduit.redfast.com/tag?domain=${window.location.hostname}`);
    }
  }
}
