
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
    });
  });

  describe('cardType', function() {
    it('should parse visa', function() {
      var type = recurly.validate.cardType('4111-1111-1111-1111');
      assert('visa' === type);
    });

    it('should parse american_express', function() {
      var type = recurly.validate.cardType('372546612345678');
      assert('american_express' === type);
    });

    it('should parse unknown', function() {
      var type = recurly.validate.cardType('867-5309-jenny');
      assert('unknown' === type);
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
    it('should return true for a valid cvv', function() {
      assert(true === recurly.validate.cvv('123'));
    });

    it('should return false for an invalid cvv', function() {
      assert(false === recurly.validate.cvv('1'));
    });
  })
});
