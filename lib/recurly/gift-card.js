import errors from './errors';

const debug = require('debug')('recurly:giftcard');

/**
 * giftCard
 *
 * Retrieves giftCard pricing info based on a redemption code. The `callback` signature
 * is `err, gift_card` where `err` may be a request or server error and `gift_card` is
 * giftcard pricing data.
 *
 * @param {Object} options
 * @param {String} options.code Gift card redemption code
 * @param {Function} callback
 */

export default function giftCard (options, done) {
  debug('%j', options);

  if (typeof done !== 'function') {
    throw errors('missing-callback');
  }

  if (typeof options !== 'object' || options === null) {
    throw errors('invalid-options');
  }

  // DEPRECATED: 'options.giftcard'
  const code = options.code || options.giftcard;
  if (!code) {
    throw errors('invalid-option', { name: 'code', expect: 'a String' });
  }

  const route = `/gift_cards/${code}`;
  this.request.get({ route, data: options, done });
}
