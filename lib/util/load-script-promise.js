import Promise from 'promise';
import loadScript from 'load-script';

/**
 * Dynamically loads a script in a Promise
 *
 * @param {String} src URL of the script to load
 */

export function loadScriptPromise (src) {
  return new Promise((resolve, reject) => {
    loadScript(src, (err, script) => {
      if (err) reject(err);
      else resolve(script);
    });
  });
}