import assert from 'assert';
import { Recurly } from '../../lib/recurly';
import { initRecurly, apiTest } from './support/helpers';

apiTest(function (requestMethod) {
  describe('Recurly.plan (' + requestMethod + ')', function () {
    const valid = 'basic';
    const invalid = 'invalid';

    beforeEach(function () {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
    });

    it('requires a callback', function () {
      const { recurly } = this;
      assert.throws(() => recurly.plan(valid), 'Missing callback');
    });

    it('requires a plan code', function () {
      const { recurly } = this;
      assert.throws(() => recurly.plan(), 'Missing plan code');
    });

    it('requires Recurly.configure', function () {
      try {
        const recurly = new Recurly();
        recurly.plan(valid, () => {});
      } catch (e) {
        assert(~e.message.indexOf('configure'));
      }
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
});
