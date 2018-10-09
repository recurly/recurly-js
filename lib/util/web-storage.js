const debug = require('debug')('recurly:web-storage');

export const NAMESPACE = '__recurly__';
export const STORES = {
  local: () => window.localStorage,
  session: () => window.sessionStorage
};

export const objectStore = {
  setItem: function (name, value) { return this[name] = value; },
  getItem: function (name) {
    if (name in this) return this[name];
    else return null;
  }
};

const namespaced = key => `${NAMESPACE}.${key}`;

/**
 * Fetches a value from web storage, optionally setting its value
 * if it is not already set
 *
 * @param  {String}    options.scope       'session' or 'local'
 * @param  {String}    options.key         item key
 * @param  {DOMString} [options.otherwise] value to set if this key is new
 * @param  {DOMString} [options.set]       force a value to be set
 * @return {Mixed}     item value
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

function store (scope) {
  try {
    const store = STORES[scope]();
    store.setItem(NAMESPACE, NAMESPACE);
    store.removeItem(NAMESPACE);
    return store;
  } catch (e) {
    debug('Web storage is not available due to', e);
    return objectStore;
  }
}
