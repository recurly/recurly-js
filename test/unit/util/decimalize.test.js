import assert from 'assert';
import decimalize, { publishPrecise, round } from '../../../lib/util/decimalize';

describe('round', () => {
  it('rounds to the requested precision', () => {
    assert.strictEqual(round(0.425, 2), 0.43);
    assert.strictEqual(round(0.425, 9), 0.425);
    assert.strictEqual(round(-1.235, 2), -1.24);
  });

  it('rounds magnitudes whose shifted value stringifies exponentially', () => {
    assert.strictEqual(round(1e12, 9), 1e12);
    assert.strictEqual(round(-1e12, 9), -1e12);
    assert.strictEqual(round(1e19, 2), 1e19);
    assert.strictEqual(round(-1e19, 2), -1e19);
  });
});

describe('decimalize', () => {
  it('stringifies magnitudes whose shifted value stringifies exponentially', () => {
    assert.strictEqual(decimalize(1e19), '10000000000000000000.00');
  });
});

describe('publishPrecise', () => {
  it('returns the value when representable in two decimals', () => {
    assert.strictEqual(publishPrecise(42.5), 42.5);
    assert.strictEqual(publishPrecise(1e12), 1e12);
  });

  it('returns a nine-decimal string for sub-cent values', () => {
    assert.strictEqual(publishPrecise(0.425), '0.425000000');
  });
});
