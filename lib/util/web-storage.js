const NAMESPACE = '__recurly__';

/**
 * Fetches a value from web storage, optionally setting its value
 * if it is not already set
 *
 * @param  {String} options.scope 'session' or 'local'
 * @param  {String} options.key item key
 * @param  {DOMString} [options.otherwise] fallback
 * @return {Mixed} item value
 */
export function storage ({ scope = 'local', key, otherwise }) {
  const store = scope === 'session' ? global.sessionStorage : global.localStorage;
  let qualifiedKey = `${NAMESPACE}.${key}`;
  let value = store.getItem(qualifiedKey);

  if (value === null && !~[null, undefined].indexOf(otherwise)) {
    value = otherwise;
    store.setItem(qualifiedKey, value);
  }

  return value;
}
