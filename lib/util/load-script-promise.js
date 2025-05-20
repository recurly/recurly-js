import Promise from 'promise';
import loadScript from 'load-script';

/**
 * Dynamically loads a script in a Promise
 *
 * @param {String} src URL of the script to load
 * @param {Object} [opts]
 * @param {Object} [opts.attrs] hash of attributes to apply to the script tag
 */

export default function loadScriptPromise (src, opts = {}) {
  return new Promise((resolve, reject) => loadScript(src, opts, (err, script) => {
    if (err) reject(err);
    else resolve(script);
  }));
}
