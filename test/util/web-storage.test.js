import assert from 'assert';
import {fetch, set, NAMESPACE, STORES, objectStore} from '../../lib/util/web-storage';

describe('storage', () => {
  const localStorage = window.localStorage;
  const sessionStorage = window.sessionStorage;
  const example = 'example';
  const exampleKey = `${NAMESPACE}.test`;

  describe('when storage is available', () => {
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

    describe('fetch', () => {
      it('fetches from localStorage by default', () => {
        assert.strictEqual(fetch({ key: exampleKey }), null);
        localStorage.setItem(exampleKey, example);
        assert.strictEqual(fetch({ key: 'test' }), example);
      });

      it('fetches from sessionStorage', () => {
        assert.strictEqual(fetch({ scope: 'session', key: exampleKey }), null);
        sessionStorage.setItem(exampleKey, example);
        assert.strictEqual(fetch({ scope: 'session', key: 'test' }), example);
      });

      it('sets the value if given `otherwise` and the key does not exist', () => {
        assert.strictEqual(fetch({ key: 'test' }), null);
        fetch({ key: 'test', otherwise: example });
        assert.strictEqual(fetch({ key: 'test' }), example);
        assert.strictEqual(localStorage.getItem(exampleKey), example);
      });

      it('fetches a previously-set value', () => {
        assert.strictEqual(fetch({ key: 'test' }), null);
        assert.strictEqual(fetch({ key: 'test', otherwise: example }), example);
        assert.strictEqual(fetch({ key: 'test' }), example);
      });
    });

    describe('set', () => {
      it('sets on localStorage by default', () => {
        assert.strictEqual(localStorage.getItem(exampleKey), null);
        set({ key: 'test', value: example });
        assert.strictEqual(localStorage.getItem(exampleKey), example);
      });

      it('sets on sessionStorage when specified', () => {
        assert.strictEqual(sessionStorage.getItem(exampleKey), null);
        set({ scope: 'session', key: 'test', value: example });
        assert.strictEqual(sessionStorage.getItem(exampleKey), example);
      });

      it('returns the new value', () => {
        assert.strictEqual(localStorage.getItem(exampleKey), null);
        assert.strictEqual(set({ key: 'test', value: example }), example);
      });
    });
  });

  describe('when storage is not available', () => {
    beforeEach(() => {
      STORES.local = sinon.stub().throws();
    });

    afterEach(() => {
      STORES.local = window.localStorage;
    });

    it('falls back to using a POJO for storage', function () {
      assert.strictEqual(objectStore[exampleKey], undefined);
      assert.strictEqual(fetch({ key: 'test' }), null);
      fetch({ key: 'test', otherwise: example });
      assert.strictEqual(objectStore[exampleKey], example);
      assert.strictEqual(fetch({ key: 'test' }), example);
    });
  });
});
