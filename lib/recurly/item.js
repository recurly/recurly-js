import errors from './errors';

const debug = require('debug')('recurly:item');

/**
 * Item
 *
 * Retrieves item pricing info based on an item code.
 *
 * @param {Object} options
 * @param {String} options.itemCode
 * @return {Promise}
 */

export default function item ({ itemCode } = {}) {
  debug(itemCode);

  if (typeof itemCode !== 'string') {
    throw errors('invalid-option', { name: 'itemCode', expect: 'a String' });
  }

  return this.request.get({ route: `/items/${itemCode}`, cached: true });
}
