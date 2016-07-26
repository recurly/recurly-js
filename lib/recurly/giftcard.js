
/*!
 * Module dependencies.
 */

import type from 'component-type';
const debug = require('debug')('recurly:giftcard');
import errors from '../errors';

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

  if ('function' !== type(callback)) {
    throw errors('missing-callback');
  }

  if ('object' !== type(options)) {
    throw errors('invalid-options');
  }

  if (!('giftcard' in options)) {
    throw errors('missing-giftcard');
  }

  this.request('get', '/gift_cards/' + options.giftcard, options, callback);
}
