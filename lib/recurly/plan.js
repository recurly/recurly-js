var debug = require('debug')('recurly:plan');

/**
 * Plan
 *
 * Retrieves information for the `plan`. The `callback` signature
 * is `err, plan` where `err` may be a request or server error, and `plan`
 * is a representation of the requested plan.
 *
 * @param {String} code
 * @param {Function} done callback
 */

export default function plan (code, done) {
  debug('%s', code);

  if (typeof done !== 'function') {
    throw new Error('Missing callback');
  }

  if (typeof code === 'undefined' || code === '') {
    return done(new Error('Missing plan code'));
  }

  const route = `/plans/${code}`;
  this.request.get({ route, cached: true, done });
}
