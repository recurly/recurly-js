import assert from 'assert';
import { Recurly } from '../../lib/recurly';
import { initRecurly } from './support/helpers';

describe('Recurly.plan', function () {
  const valid = 'basic';
  const invalid = 'invalid';

  beforeEach(function () {
    this.recurly = initRecurly();
  });

  afterEach(function () {
    this.recurly.destroy();
  });

  it('requires a callback', function () {
    const { recurly } = this;
    assert.throws(() => recurly.plan(valid), { message: 'Missing callback' });
  });

  it('requires a plan code', function (done) {
    const { recurly } = this;
    recurly.plan(undefined, (err) => {
      assert.strictEqual(err.message, 'Missing plan code');
      done();
    });
  });

  describe('when given an invalid plan', function () {
    it('produces an error', function (done) {
      const { recurly } = this;
      recurly.plan(invalid, function (err, plan) {
        assert(err);
        assert(!plan);
        done();
      });
    });
  });

  describe('when given a valid plan', function () {
    it('yields a plan', function (done) {
      const { recurly } = this;
      recurly.plan(valid, function (err, plan) {
        assert(!err);
        assert(plan);
        assert(plan.code === 'basic');
        assert(plan.name === 'Basic');
        assert(plan.period);
        assert(plan.price);
        assert(typeof plan.tax_exempt === 'boolean');
        done();
      });
    });
  });
});
