import Promise from 'promise';
import loadScript from 'load-script';

/**
 * Dynamically loads a script in a Promise
 *
 * @param {String} src URL of the script to load
 */

// The function below was suggested by the merchant and then approved/formatted 
// by Doug Miller who wrote the load-script-promise.js file

// const loadScriptPromise = (src) => {
//   return new Promise((resolve, reject) => {
//     loadScript(src, (err, script) => {
//       if (err) reject(err);
//       else resolve(script);
//     });
//   });
// };

//module.exports = loadScriptPromise;


// The function below was written by Seth Brown
// in an attempt to export the function by default rather
// than with module.exports because of a MAKE TEST error

export default function loadScriptPromise(src) {
  return new Promise((resolve, reject) => {
    loadScript(src, (err, script) => {
      if (err) reject(err);
      else resolve(script);
    });
  });
};