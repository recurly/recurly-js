var assert = require('component/assert');
var noop = require('chrissrogers/noop');
var helpers = require('./support/helpers');
var sinon = window.sinon;

helpers.apiTest(function (requestMethod) {
  describe('Recurly.tax (' + requestMethod + ')', function () {
    var Recurly = window.recurly.Recurly;
    var recurly;

    var us = {
      country: 'US',
      postal_code: '94110'
    };
    var vat = {
      country: 'DE'
    };
    var none = {
      country: 'CA',
      postal_code: 'A1A 1A1'
    }

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
        recurly.tax(us);
      } catch (e) {
        assert(~e.message.indexOf('callback'));
      }
    });

    it('requires Recurly.configure', function () {
      try {
        recurly = new Recurly();
        recurly.tax(us, noop);
      } catch (e) {
        assert(~e.message.indexOf('configure'));
      }
    });

    describe('when given a taxable US postal code', function () {
      it('yields a tax type and rate', function (done) {
        recurly.tax(us, function (err, taxes) {
          var tax = taxes[0];
          assert(!err);
          assert(taxes.length === 1);
          assert(tax.type === 'us');
          assert(tax.rate === '0.0875');
          done();
        });
      });
    });

    describe('when given a taxable VAT country', function () {
      it('yields a tax type and rate', function (done) {
        recurly.tax(vat, function (err, taxes) {
          var tax = taxes[0];
          assert(!err);
          assert(taxes.length === 1);
          assert(tax.type === 'vat');
          assert(tax.rate === '0.015');
          done();
        });
      });
    });

    describe('when given a non-taxable country', function () {
      it('yields an empty array', function (done) {
        recurly.tax(none, function (err, taxes) {
          assert(!err);
          assert(taxes.length === 0);
          done();
        });
      });
    });

    describe('when given a non-taxable US postal code', function () {
      it('yields an empty array', function (done) {
        recurly.tax({
          country: 'US',
          postal_code: '70118'
        }, function (err, taxes) {
          assert(!err);
          assert(taxes.length === 0);
          done();
        });
      });
    });

    describe('when given a tax_code', function () {
      it('sends the tax_code', function (done) {
        var spy = sinon.spy(recurly, 'request');

        recurly.tax({
          country: 'US',
          postal_code: '70118',
          tax_code: 'digital'
        }, function (err, taxes) {
          assert(!err);
          assert(spy.calledOnce);
          assert(spy.args[0][2].tax_code === 'digital');
          spy.restore();
          done();
        });
      });
    });

    describe('when given a vat_number', function () {
      it('sends the vat_number', function (done) {
        var spy = sinon.spy(recurly, 'request');

        recurly.tax({
          country: 'GB',
          vat_number: 'GB0000'
        }, function (err, taxes) {
          assert(!err);
          assert(spy.calledOnce);
          assert(spy.args[0][2].vat_number === 'GB0000');
          spy.restore();
          done();
        });
      });
    });
  });
});
