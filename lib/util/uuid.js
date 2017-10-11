/**
 * Generates a simple uuid
 *
 * @param {Number} len - Length of uuid. Maxiumum is 12.
 */

export function uuid (len = 12) {
  Math.random().toString(36).substr(2, len);
}
