import errors from '../errors';

const debug = require('debug')('recurly:giftcard');

/**
 * Giftcard mixin.
 *
 * Retrieves giftcard pricing info based on a redemption code. The `callback` signature
 * is `err, gift_card` where `err` may be a request or server error and `gift_card` is
 * giftcard pricing data.
 *
 * @param {Object} options
 * @param {Function} callback
 */

export default function giftcard (options, callback) {
  debug('%j', options);

  if (typeof callback !== 'function') {
    throw errors('missing-callback');
  }

  if (typeof options !== 'object') {
    throw errors('invalid-options');
  }

  if (!('giftcard' in options)) {
    throw errors('missing-giftcard');
  }

  this.request('get', '/gift_cards/' + options.giftcard, options, callback);
}
