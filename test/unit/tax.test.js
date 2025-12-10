import assert from 'assert';
import { initRecurly } from './support/helpers';

describe('Recurly.tax', function () {
  beforeEach(function () {
    this.recurly = initRecurly();
    this.sandbox = sinon.createSandbox();

    this.us = {
      country: 'US',
      postal_code: '94110'
    };
    this.vat = {
      country: 'DE'
    };
    this.none = {
      country: 'CA',
      postal_code: 'A1A 1A1'
    };
  });

  afterEach(function () {
    this.recurly.destroy();
    this.sandbox.restore();
  });

  it('requires a callback', function () {
    assert.throws(() => this.recurly.tax(this.us), /callback/);
  });

  it('yields a tax type and rate when given a taxable US postal code', function (done) {
    this.recurly.tax(this.us, function (err, taxes) {
      assert(!err);
      assert(taxes.length === 1);
      assert(taxes[0].type === 'us');
      assert(taxes[0].rate === '0.0875');
      done();
    });
  });

  it('yields a tax type and rate when given a taxable VAT country', function (done) {
    this.recurly.tax(this.vat, function (err, taxes) {
      assert(!err);
      assert(taxes.length === 1);
      assert(taxes[0].type === 'vat');
      assert(taxes[0].rate === '0.015');
      done();
    });
  });

  it('yields an empty array when given a non-taxable country', function (done) {
    this.recurly.tax(this.none, function (err, taxes) {
      assert(!err);
      assert(taxes.length === 0);
      done();
    });
  });

  it('yields an empty array when given a non-taxable US postal code', function (done) {
    this.recurly.tax({
      country: 'US',
      postal_code: '70118'
    }, function (err, taxes) {
      assert(!err);
      assert(taxes.length === 0);
      done();
    });
  });

  it('sends the tax_code when given a tax_code', function (done) {
    const { recurly, sandbox } = this;

    sandbox.spy(recurly.request, 'request');

    recurly.tax({
      country: 'US',
      postal_code: '70118',
      tax_code: 'digital'
    }, function (err) {
      assert(!err);
      assert(recurly.request.request.calledOnce);
      assert(recurly.request.request.calledWithMatch(sinon.match({ data: { tax_code: 'digital' } })));
      done();
    });
  });

  it('sends the vat_number when given a vat_number', function (done) {
    const { recurly, sandbox } = this;

    sandbox.spy(recurly.request, 'request');

    recurly.tax({
      country: 'GB',
      vat_number: 'GB0000'
    }, function (err) {
      assert(!err);
      assert(recurly.request.request.calledOnce);
      assert(recurly.request.request.calledWithMatch(sinon.match({ data: { vat_number: 'GB0000' } })));
      done();
    });
  });
});
