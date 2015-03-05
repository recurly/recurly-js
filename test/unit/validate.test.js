
var assert = require('assert');

describe('Recurly.validate', function () {
  var Recurly = window.recurly.Recurly;
  var recurly;

  beforeEach(function () {
     recurly = new Recurly();
  });

  describe('cardNumber', function () {
    it('should return true for valid card numbers', function() {
      assert(true === recurly.validate.cardNumber('4111111111111111'));
    });

    it('should return false for invalid card numbers', function() {
      assert(false === recurly.validate.cardNumber('4111-1111-1111-1112'));
      assert(false === recurly.validate.cardNumber('1234'));
      assert(false === recurly.validate.cardNumber(1234));
      assert(false === recurly.validate.cardNumber('0'));
      assert(false === recurly.validate.cardNumber(0));
      assert(false === recurly.validate.cardNumber('abcxyz'));
      assert(false === recurly.validate.cardNumber(''));
      assert(false === recurly.validate.cardNumber());
      assert(false === recurly.validate.cardNumber(null));
    });
  });

  describe('cardType', function() {
    it('should parse visa', function() {
      var type = recurly.validate.cardType('4111-1111-1111-1111');
      assert(type === 'visa');
    });

    it('should parse american_express', function() {
      var type = recurly.validate.cardType('372546612345678');
      assert(type === 'american_express');
    });

    it('should parse unknown', function() {
      var type = recurly.validate.cardType('867-5309-jenny');
      assert(type === 'unknown');
    });

    it('should not parse partial numbers', function () {
      var type = recurly.validate.cardType('3725');
      assert(type === 'unknown');
    });

    it('should parse partial numbers if instructed', function () {
      var type = recurly.validate.cardType('3725', true);
      assert(type === 'american_express');
    });
  });

  describe('expiry', function() {
    it('should return true without leading zeros', function() {
      assert(true === recurly.validate.expiry(1, 2020));
    });

    it('should return true for leading zeros', function() {
      assert(true === recurly.validate.expiry('01', '16'));
    });

    it('should return false for invalid dates', function() {
      assert(false === recurly.validate.expiry('12', '2013'));
    });
  });

  describe('cvv', function() {
    it('should return true for a valid CVV String or Number', function() {
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

    it('should return false for an invalid CVV String or Number', function() {
      assert(false === recurly.validate.cvv(1));
      assert(false === recurly.validate.cvv(123456));
      assert(false === recurly.validate.cvv('1'));
      assert(false === recurly.validate.cvv('xyz'));
      assert(false === recurly.validate.cvv('12f'));
      assert(false === recurly.validate.cvv('123f'));
      assert(false === recurly.validate.cvv('123456'));
    });
  })
});
