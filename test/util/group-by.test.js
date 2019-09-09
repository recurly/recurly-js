import assert from 'assert';
import groupBy from '../../lib/util/group-by';

describe('groupBy', () => {
  beforeEach(function () {
    this.example = ['a', 'b', 'b', 'b', 'c', 'd', 'e', 'a'];
  });

  it('groups according to the value by default', function () {
    const { example } = this;
    const result = groupBy(example);
    assert.strictEqual(typeof result, 'object');
    assert.strictEqual(Object.keys(result).length, 5);
    assert(Array.isArray(result.a));
    assert(Array.isArray(result.b));
    assert(Array.isArray(result.c));
    assert(Array.isArray(result.d));
    assert(Array.isArray(result.e));
    assert.strictEqual(result.a.length, 2);
    assert.strictEqual(result.b.length, 3);
    assert.strictEqual(result.c.length, 1);
    assert.strictEqual(result.d.length, 1);
    assert.strictEqual(result.e.length, 1);
  });

  it('accepts an iteratee function to override grouping', function () {
    const { example } = this;
    const iteratee = v => v === 'b' ? 'x' : 'y';
    const result = groupBy(example, iteratee);
    assert.strictEqual(typeof result, 'object');
    assert.strictEqual(Object.keys(result).length, 2);
    assert.strictEqual(result.x.length, 3);
    assert.strictEqual(result.y.length, 5);
    assert.deepStrictEqual(result.x, ['b', 'b', 'b']);
    assert.deepStrictEqual(result.y, ['a', 'c', 'd', 'e', 'a']);
  });
});
