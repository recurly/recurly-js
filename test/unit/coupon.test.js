
var assert = require('assert');
var each = require('each');
var sinon = require('sinon');
var noop = require('noop');

describe('Recurly.coupon', function () {
  var Recurly = window.recurly.Recurly;
  var valid = { plan: 'basic', coupon: 'coop' };
  var invalidPlan = { plan: 'invalid', coupon: 'coop' };
  var invalidCoupon = { plan: 'basic', coupon: 'invalid' };
  var recurly;

  beforeEach(function () {
    recurly = new Recurly();
    recurly.configure({
      publicKey: 'test',
      api: 'http://' + window.location.host
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
      assert(e);
    }
  });

  describe('when given an invalid plan', function () {
    it('produces an error', function (done) {
      recurly.coupon({ plan: 'invalid', coupon: 'coop' }, function (err) {
        assert(err);
        done();
      });
    });
  });

  describe('when given a valid plan', function () {
    describe('when given an invalid coupon', function () {
      it('should throw an error');
    });

    describe('when given a valid coupon', function () {
      it('should fetch them from the api');
    });
  });
});
