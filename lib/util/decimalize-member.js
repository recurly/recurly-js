/**
 * Applies a decimal transform on an object's member
 *
 * @param {String} prop Property on {this} to transform
 * @this {Object} on which to apply decimal transformation
 */

export function decimalizeMember (prop) {
  this[prop] = (Math.round(Math.max(this[prop], 0) * 100) / 100).toFixed(2);
}
