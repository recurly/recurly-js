import assert from 'assert';
import { Recurly } from '../../lib/recurly';
import { initRecurly } from './support/helpers';

describe('Recurly.giftCard', function () {
  const valid = { code: 'super-gift-card' };
  const invalid = { code: 'invalid' };

  beforeEach(function () {
    this.recurly = initRecurly();
  });

  afterEach(function () {
    this.recurly.destroy();
  });

  it('requires a callback', function () {
    assert.throws(() => this.recurly.giftCard(valid), { message: 'Missing callback' });
  });

  it('requires options', function () {
    assert.throws(() => this.recurly.giftCard(null, () => {}), { message: 'Options must be an object' });
  });

  it('requires options.code', function () {
    assert.throws(() => this.recurly.giftCard({ arbitrary: 'values' }, () => {}), { message: 'Option code must be a String' });
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
      this.recurly.giftCard(invalid, function (err, giftCard) {
        assert(err);
        assert(!giftCard);
        done();
      });
    });
  });

  describe('when given a valid code', function () {
    it('contains a discount amount', function (done) {
      this.recurly.giftCard(valid, (err, giftCard) => {
        const { unit_amount, currency } = giftCard;
        assert.strictEqual(unit_amount, 20);
        assert.strictEqual(currency, 'USD');
        done();
      });
    });
  });

  describe('deprecated behavior', function () {
    it('may be called at recurly.giftcard', function (done) {
      this.recurly.giftcard(valid, (err, giftCard) => {
        assert(!err);
        assert(giftCard);
        done();
      });
    });

    it('accepts options.code as options.giftcard', function (done) {
      this.recurly.giftCard({ giftcard: valid.code }, (err, giftCard) => {
        assert(!err);
        assert(giftCard);
        done();
      });
    });
  });
});
