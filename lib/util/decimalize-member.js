/**
 * Applies a decimal transform on an object's member
 *
 * @param {String} prop Property on {this} to transform
 * @this {Object} on which to apply decimal transformation
 */

export default function decimalizeMember (prop) {
  if (typeof this[prop] !== 'number') return;
  this[prop] = (Math.round(Math.max(this[prop], 0) * 100) / 100).toFixed(2);
}
