import uuid from 'uuid/v4';

/**
 * returns a new base64-encoded UUID (v4)
 *
 * @return {String}
 */
export default function base64UUID () {
  return btoa(uuid());
}
