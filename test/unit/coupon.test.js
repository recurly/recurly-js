
var assert = require('assert');
var each = require('each');
var noop = require('noop');
var helpers = require('../support/helpers');

helpers.apiTest(function (requestMethod) {
  describe('Recurly.coupon (' + requestMethod + ')', function () {
    var Recurly = window.recurly.Recurly;
    var valid = { plan: 'basic', coupon: 'coop' };
    var invalidPlan = { plan: 'invalid', coupon: 'coop' };
    var invalidCoupon = { plan: 'basic', coupon: 'coop-invalid' };
    var recurly;

    beforeEach(function () {
      recurly = new Recurly();
      recurly.configure({
        publicKey: 'test',
        api: '//' + window.location.host,
        cors: requestMethod === 'cors'
      });
    });

    it('requires a callback', function () {
      try {
        recurly.coupon(valid);
      } catch (e) {
        assert(~e.message.indexOf('callback'));
      }
    });

    it('requires Recurly.configure', function () {
      try {
        recurly = new Recurly();
        recurly.coupon(valid, noop);
      } catch (e) {
        assert(~e.message.indexOf('configure'));
      }
    });

    describe('when given an invalid plan', function () {
      it('produces an error', function (done) {
        recurly.coupon(invalidPlan, function (err, coupon) {
          assert(err);
          assert(!coupon);
          done();
        });
      });
    });

    describe('when given a valid plan', function () {
      describe('when given an invalid coupon', function () {
        it('should throw an error', function (done) {
          recurly.coupon(invalidCoupon, function (err, coupon) {
            assert(err);
            assert(!coupon);
            done();
          });
        });
      });

      describe('when given a valid coupon', function () {
        it('contains a discount amount', function (done) {
          assertValidCoupon('coop', function (coupon) {
            assert(!coupon.discount.rate);
            each(coupon.discount, function (currency, amount) {
              assert(currency.length === 3);
              assert(typeof amount === 'number');
            });
            done();
          });
        });
      });

      describe('when given a valid percent-based coupon', function () {
        it('contains a discount rate', function (done) {
          assertValidCoupon('coop-pct', function (coupon) {
            assert(typeof coupon.discount.rate === 'number');
            done();
          });
        });
      });
    });

    function assertValidCoupon (code, done) {
      recurly.coupon({ plan: 'basic', coupon: code }, function (err, coupon) {
        assert(coupon);
        assert(coupon.code);
        assert(coupon.name);
        done(coupon);
      });
    }
  });
});
