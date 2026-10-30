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
      assert.strictEqual(recurly.validate.cardType('4111-1111-1111-1'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4111-1111-1111-1111'), 'visa');
    });

    it('should parse discover', function () {
      assert.strictEqual(recurly.validate.cardType('6011000090139424'), 'discover');
      assert.strictEqual(recurly.validate.cardType('6011039990139424'), 'discover');
      assert.strictEqual(recurly.validate.cardType('6043550000000000'), 'discover');
      assert.strictEqual(recurly.validate.cardType('6500870000000008'), 'discover');
      assert.strictEqual(recurly.validate.cardType('5896578742026538'), 'discover');
    });

    it('should parse union_pay', function () {
      assert.strictEqual(recurly.validate.cardType('6210939911113245'), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('6210950011113245'), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('6210940011113245'), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('6210949911113245'), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('8171999927660000'), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('6200000000000005'), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('8171999900000000021'), 'union_pay');
    });

    it('should parse mastercard', function () {
      assert.strictEqual(recurly.validate.cardType('5454545454545454'), 'master');
      assert.strictEqual(recurly.validate.cardType('5555555555554444'), 'master');
      assert.strictEqual(recurly.validate.cardType('5555555555554444'), 'master');
      assert.strictEqual(recurly.validate.cardType('2222000222222224'), 'master');
      assert.strictEqual(recurly.validate.cardType('2720989999999955'), 'master');
      assert.strictEqual(recurly.validate.cardType('5062224607440872'), 'master');
      assert.strictEqual(recurly.validate.cardType('2869000000000006'), 'master');
    });

    it('should parse american_express', function () {
      assert.strictEqual(recurly.validate.cardType('372546612345678'), 'american_express');
    });

    it('should parse Elo', function () {
      assert.strictEqual(recurly.validate.cardType('4514161111111119'), 'elo');
      assert.strictEqual(recurly.validate.cardType('5066991111111118'), 'elo');
      assert.strictEqual(recurly.validate.cardType('5091516900129341'), 'elo');
      assert.strictEqual(recurly.validate.cardType('6362971111111117'), 'elo');
      assert.strictEqual(recurly.validate.cardType('6363681111111115'), 'elo');
      assert.strictEqual(recurly.validate.cardType('6509130000000016'), 'elo');
    });

    it('should parse Hipercard', function () {
      assert.strictEqual(recurly.validate.cardType('6062828888666688'), 'hipercard');
    });

    it('should parse Tarjeta Naranja', function () {
      assert.strictEqual(recurly.validate.cardType('5895620000000002'), 'tarjeta_naranja');
      assert.strictEqual(recurly.validate.cardType('5895629999999999'), 'tarjeta_naranja');
    });

    it('should parse maestro', function () {
      assert.strictEqual(recurly.validate.cardType('627781000000000'), 'maestro');
      assert.strictEqual(recurly.validate.cardType('6010999990139424'), 'maestro');
      assert.strictEqual(recurly.validate.cardType('6219803011113245'), 'maestro');
      assert.strictEqual(recurly.validate.cardType('5061990000000000'), 'maestro');
      assert.strictEqual(recurly.validate.cardType('5064510000000000'), 'maestro');
      assert.strictEqual(recurly.validate.cardType('6043540000000000'), 'maestro');
      assert.strictEqual(recurly.validate.cardType('6043560000000000'), 'maestro');
      assert.strictEqual(recurly.validate.cardType('5896560000000000'), 'maestro');
      assert.strictEqual(recurly.validate.cardType('5896580000000000'), 'maestro');
    });

    it('should parse Tarjeta Naranja Brazilian BINs', function () {
      assert.strictEqual(recurly.validate.cardType('4050100000000001'), 'tarjeta_naranja');
      assert.strictEqual(recurly.validate.cardType('4144270000000002'), 'tarjeta_naranja');
      assert.strictEqual(recurly.validate.cardType('4154750000000003'), 'tarjeta_naranja');
      assert.strictEqual(recurly.validate.cardType('4317640000000004'), 'tarjeta_naranja');
      assert.strictEqual(recurly.validate.cardType('4326360000000005'), 'tarjeta_naranja');
      assert.strictEqual(recurly.validate.cardType('4779380000000006'), 'tarjeta_naranja');
    });

    it('should parse Brazilian debit Visa BINs', function () {
      assert.strictEqual(recurly.validate.cardType('4066470000000001'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4237100000000002'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4237570000000003'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4237710000000004'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4237730000000005'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4278350000000006'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4700610000000007'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4700830000000008'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4700840000000009'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4700880000000010'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4700890000000011'), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('4760950000000012'), 'visa_debit');
    });

    it('should parse Brazilian debit MasterCard BINs', function () {
      assert.strictEqual(recurly.validate.cardType('5340900000000001'), 'mastercard_debit');
      assert.strictEqual(recurly.validate.cardType('5453710000000002'), 'mastercard_debit');
    });

    it('should keep neighboring BINs on their current card types', function () {
      assert.strictEqual(recurly.validate.cardType('4050090000000001'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4050110000000003'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4237720000000007'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4779390000000019'), 'visa');
      assert.strictEqual(recurly.validate.cardType('5340890000000001'), 'master');
      assert.strictEqual(recurly.validate.cardType('5340910000000003'), 'master');
      assert.strictEqual(recurly.validate.cardType('5453720000000006'), 'master');
      assert.strictEqual(recurly.validate.cardType('5062000000000000'), 'master');
      assert.strictEqual(recurly.validate.cardType('5064500000000000'), 'master');
      assert.strictEqual(recurly.validate.cardType('4066460000000002'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4066480000000006'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4700600000000010'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4700620000000012'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4700850000000013'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4700900000000015'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4760960000000016'), 'visa');
      assert.strictEqual(recurly.validate.cardType('4779370000000017'), 'visa');
      assert.strictEqual(recurly.validate.cardType('5453700000000004'), 'master');
    });

    it('should parse unknown', function () {
      assert.strictEqual(recurly.validate.cardType('867-5309-jenny'), 'unknown');
    });

    it('should return unknown for 13-digit carved BIN numbers', function () {
      assert.strictEqual(recurly.validate.cardType('4050100000000'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('4066470000000'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('5340900000000'), 'unknown');
    });

    it('should parse partial BIN prefixes for the new types', function () {
      assert.strictEqual(recurly.validate.cardType('405010', true), 'tarjeta_naranja');
      assert.strictEqual(recurly.validate.cardType('40500', true), 'visa');
      assert.strictEqual(recurly.validate.cardType('406647', true), 'visa_debit');
      assert.strictEqual(recurly.validate.cardType('534090', true), 'mastercard_debit');
      assert.strictEqual(recurly.validate.cardType('545371', true), 'mastercard_debit');
      assert.strictEqual(recurly.validate.cardType('53408', true), 'master');
    });

    it('should not parse partial numbers', function () {
      assert.strictEqual(recurly.validate.cardType('3725'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('62109400'), 'unknown');
    });

    it('should not parse partial numbers for maestro', function () {
      assert.strictEqual(recurly.validate.cardType('6'), 'unknown');
      assert.strictEqual(recurly.validate.cardType('5000'), 'unknown');
    });

    it('should not parse partial numbers when multiple matches', function () {
      assert.strictEqual(recurly.validate.cardType('3', true), 'unknown');
      assert.strictEqual(recurly.validate.cardType('38', true), 'unknown');
      assert.strictEqual(recurly.validate.cardType('5', true), 'unknown');
    });

    it('should parse partial numbers if instructed', function () {
      assert.strictEqual(recurly.validate.cardType('3725', true), 'american_express');
      assert.strictEqual(recurly.validate.cardType('62213000', true), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('6272', true), 'union_pay');
      assert.strictEqual(recurly.validate.cardType('44', true), 'visa');
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
