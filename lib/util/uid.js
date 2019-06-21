import nanoid from 'nanoid/generate';

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * returns a new nanoid according to our charset
 *
 * @return {String}
 */
export default function uid () {
  return nanoid(CHARSET, 16);
}
