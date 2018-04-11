import assert from 'assert';
import {storage, NAMESPACE} from '../../lib/util/web-storage';

describe('storage', () => {
  const localStorage = window.localStorage;
  const sessionStorage = window.sessionStorage;
  const example = 'example';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    assert.strictEqual(localStorage.length, 0);
    assert.strictEqual(sessionStorage.length, 0);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('fetches from localStorage by default', () => {
    assert.strictEqual(storage({ key: `${NAMESPACE}.test` }), null);
    localStorage.setItem(`${NAMESPACE}.test`, example);
    assert.strictEqual(storage({ key: 'test' }), example);
  });

  it('fetches from sessionStorage', () => {
    assert.strictEqual(storage({ scope: 'session', key: `${NAMESPACE}.test` }), null);
    sessionStorage.setItem(`${NAMESPACE}.test`, example);
    assert.strictEqual(storage({ scope: 'session', key: 'test' }), example);
  });

  it('sets the value if given `otherwise` and the key does not exist', () => {
    assert.strictEqual(storage({ key: 'test' }), null);
    storage({ key: 'test', otherwise: example });
    assert.strictEqual(storage({ key: 'test' }), example);
    assert.strictEqual(localStorage.getItem(`${NAMESPACE}.test`), example);
  });

  it('fetches a previously-set value', () => {
    assert.strictEqual(storage({ key: 'test' }), null);
    assert.strictEqual(storage({ key: 'test', otherwise: example }), example);
    assert.strictEqual(storage({ key: 'test' }), example);
  });
});
