/**
 * Generates a simple uuid
 *
 * NOT a standards-compliant UUID
 *
 * @param {Number} len - Length of uuid. Maxiumum is 12.
 */

export default function uuid (len = 12) {
  return Math.random().toString(36).substr(2, len);
}
