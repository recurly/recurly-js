
/**
 * Expose `after`.
 */

module.exports = after;


/**
 * Return the `fn` wrapped in logic that will only let it be called after
 * it has been invoked a certain number of `times`.
 *
 * @param {Number} times
 * @param {Function} fn
 */

function after (times, fn) {
  return function () {
    if (--times < 1) return fn.apply(this, arguments);
  };
}