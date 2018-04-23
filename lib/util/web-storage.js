export const NAMESPACE = '__recurly__';

const namespaced = key => `${NAMESPACE}.${key}`;
const store = scope => scope === 'session' ? global.sessionStorage : global.localStorage;

/**
 * Fetches a value from web storage, optionally setting its value
 * if it is not already set
 *
 * @param  {String} options.scope 'session' or 'local'
 * @param  {String} options.key item key
 * @param  {DOMString} [options.otherwise] fallback
 * @param  {DOMString} [options.set] force a value to be set
 * @return {Mixed} item value
 */
export function fetch ({ scope = 'local', key, otherwise, set }) {
  let value = store(scope).getItem(namespaced(key));

  if (value === null && !~[null, undefined].indexOf(otherwise)) {
    value = otherwise;
    store(scope).setItem(namespaced(key), value);
  }

  return value;
}

export function set ({ scope = 'local', key, value }) {
  store(scope).setItem(namespaced(key), value);
  return store(scope).getItem(namespaced(key));
}
