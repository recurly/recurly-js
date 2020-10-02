import assert from 'assert';
import { Recurly } from '../../lib/recurly';

describe('Recurly.validate', function () {
  let recurly;

  beforeEach(() => recurly = new Recurly);

  describe('cardNumber', function () {
    it('returns true for valid card numbers', function () {
      assert(true === recurly.validate.cardNumber('4111111111111111'));
    });

    it('returns false for non-numbers', () => {
      assert(false === recurly.validate.cardNumber(''));
      assert(false === recurly.validate.cardNumber());
      assert(false === recurly.validate.cardNumber(null));
    });

    it('returns false for luhn-invalid card numbers', function () {
      assert(false === recurly.validate.cardNumber('4111-1111-1111-1112'));
      assert(false === recurly.validate.cardNumber('1234'));
      assert(false === recurly.validate.cardNumber(1234));
      assert(false === recurly.validate.cardNumber('0'));
      assert(false === recurly.validate.cardNumber(0));
      assert(false === recurly.validate.cardNumber('abcxyz'));
    });

    it('returns false for short luhn-valid numbers', () => {
      assert(false === recurly.validate.cardNumber('42'));
      assert(false === recurly.validate.cardNumber('41111'));
    });
  });

  describe('cardType', function () {
    it('should parse visa', function () {
      var type = recurly.validate.cardType('4111-1111-1111-1111');
      assert(type === 'visa');
    });

    it('should parse discover', function () {
      assert.strictEqual(recurly.validate.cardType('601099999013942'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('6010999990139424'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('6011040090139424'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('6011000090139424'), 'discover');
      assert.strictEqual(recurly.validate.cardType('6011039990139424'), 'discover');
    });

    it('should parse union_pay', function () {
      assert.strictEqual(recurly.validate.cardType('621093991111324'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('6210939911113245'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('6210950011113245'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('6210940011113245'), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('6210949911113245'), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('8171999927660000'), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('8171999900000000021'), 'union_pay');
    });

    it('should parse mastercard', function () {
      assert.strictEqual(recurly.validate.cardType('5454545454545454'), 'master');
      assert.strictEqual(recurly.validate.cardType('5555555555554444'), 'master');
      assert.strictEqual(recurly.validate.cardType('5555555555554444'), 'master');
      assert.strictEqual(recurly.validate.cardType('2222000222222224'), 'master');
      assert.strictEqual(recurly.validate.cardType('2720989999999955'), 'master');
    });

    it('should parse american_express', function () {
      assert.strictEqual(recurly.validate.cardType('372546612345678'), 'american_express');
    });

    it('should parse ELO', function () {
      assert.strictEqual(recurly.validate.cardType('6363681111111115'), 'elo');
      assert.strictEqual(recurly.validate.cardType('5041751111111116'), 'elo');
      assert.strictEqual(recurly.validate.cardType('6362971111111117'), 'elo');
      assert.strictEqual(recurly.validate.cardType('5066991111111118'), 'elo');
    });

    it('should parse Hipercard', function () {
      assert.strictEqual(recurly.validate.cardType('6062828888666688'), 'hipercard');
    });

    it('should parse unknown', function () {
      assert.strictEqual(recurly.validate.cardType('867-5309-jenny'), 'unknown');
    });

    it('should not parse partial numbers', function () {
      assert.strictEqual(recurly.validate.cardType('3725'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('62109400'), 'unknown');
    });

    it('should parse partial numbers if instructed', function () {
      assert.strictEqual(recurly.validate.cardType('3725', true), 'american_express');
      assert.strictEqual(recurly.validate.cardType('62109400', true), 'union_pay');
    });
  });

  describe('expiry', function () {
    const futureYear = new Date().getFullYear() + 1;

    it('should return true for valid dates without leading zeros', function () {
      assert(true === recurly.validate.expiry(1, futureYear));
    });

    it('should return true for valid dates with leading zeros', function () {
      assert(true === recurly.validate.expiry('01', futureYear.toString().substr(2, 2)));
    });

    it('should return false for past dates', function () {
      assert(false === recurly.validate.expiry('12', '2013'));
      assert(false === recurly.validate.expiry(12, 2013));
      assert(false === recurly.validate.expiry(12, 13));
    });

    it('should return false for invalid input', function () {
      assert(false === recurly.validate.expiry('10gibberish', futureYear));
      assert(false === recurly.validate.expiry('10', `${futureYear}gibberish`));
      assert(false === recurly.validate.expiry('20', futureYear));
    });
  });

  describe('cvv', function () {
    it('should return true for a valid CVV String or Number', function () {
      assert(true === recurly.validate.cvv(123));
      assert(true === recurly.validate.cvv(1234));
      assert(true === recurly.validate.cvv('123'));
      assert(true === recurly.validate.cvv('1234'));
    });

    it('should trim input', function () {
      assert(true === recurly.validate.cvv(' 123'));
      assert(true === recurly.validate.cvv('123 '));
      assert(true === recurly.validate.cvv('   1234  '));
    });

    it('should return false for an invalid CVV String or Number', function () {
      assert(false === recurly.validate.cvv(1));
      assert(false === recurly.validate.cvv(123456));
      assert(false === recurly.validate.cvv('1'));
      assert(false === recurly.validate.cvv('xyz'));
      assert(false === recurly.validate.cvv('12f'));
      assert(false === recurly.validate.cvv('123f'));
      assert(false === recurly.validate.cvv('123456'));
    });
  });
});
