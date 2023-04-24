import assert from 'assert';
import { Recurly } from '../../lib/recurly';
import { initRecurly, apiTest } from './support/helpers';

apiTest(function (requestMethod) {
  describe('Recurly.giftCard (' + requestMethod + ')', function () {
    const valid = { code: 'super-gift-card' };
    const invalid = { code: 'invalid' };
    let recurly;

    beforeEach(function () {
      recurly = initRecurly({ cors: requestMethod === 'cors' });
    });

    it('requires a callback', function () {
      assert.throws(() => recurly.giftCard(valid), { message: 'Missing callback' });
    });

    it('requires options', function () {
      assert.throws(() => recurly.giftCard(null, () => {}), { message: 'Options must be an object' });
    });

    it('requires options.code', function () {
      assert.throws(() => recurly.giftCard({ arbitrary: 'values' }, () => {}), { message: 'Option code must be a String' });
    });

    it('requires Recurly.configure', function () {
      try {
        recurly = new Recurly();
        recurly.giftCard(valid, () => {});
      } catch (e) {
        assert(~e.message.indexOf('configure'));
      }
    });

    describe('when given an invalid code', function () {
      it('produces an error', function (done) {
        recurly.giftCard(invalid, function (err, giftCard) {
          assert(err);
          assert(!giftCard);
          done();
        });
      });
    });

    describe('when given a valid code', function () {
      it('contains a discount amount', function (done) {
        recurly.giftCard(valid, (err, giftCard) => {
          const { unit_amount, currency } = giftCard;
          assert.strictEqual(unit_amount, 20);
          assert.strictEqual(currency, 'USD');
          done();
        });
      });
    });

    describe('deprecated behavior', function () {
      it('may be called at recurly.giftcard', function (done) {
        recurly.giftcard(valid, (err, giftCard) => {
          assert(!err);
          assert(giftCard);
          done();
        });
      });

      it('accepts options.code as options.giftcard', function (done) {
        recurly.giftCard({ giftcard: valid.code }, (err, giftCard) => {
          assert(!err);
          assert(giftCard)
          done();
        });
      });
    });
  });
});
