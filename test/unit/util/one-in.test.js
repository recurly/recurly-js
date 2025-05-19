import assert from 'assert';
import oneIn from '../../../lib/util/one-in';

describe('oneIn', () => {
  it('returns true in accordance with the given odds', function () {
    const examples = [1000, 100, 10];

    for (const example of examples) {
      const actual = Array.from(Array(1000000)).reduce((acc, i) => {
        const result = oneIn(example);
        acc[result] = (acc[result] + 1) || 1;
        return acc;
      }, {});

      assert(Math.abs(actual.true / 1000000 - 1 / example) < 0.00075);
    }
  });
});
