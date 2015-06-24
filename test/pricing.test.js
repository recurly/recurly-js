var assert = require('component/assert');

describe('Recurly.Pricing', function () {
  var Recurly = window.recurly.Recurly;
  var recurly;
  var pricing;

  beforeEach(function () {
    recurly = new Recurly();
    recurly.configure({
      publicKey: 'test',
      api: '//' + window.location.host
    });
    pricing = recurly.Pricing();
  });

  it('should not append tax elements if there is no tax', function (done) {
    pricing
      .plan('basic', { quantity: 1 })
      .address({
        country: 'US',
        postal_code: 'NoTax'
      })
      .done(function (price) {
        assert.equal(price.taxes.length, 0);
        assert.equal(price.now.tax, '0.00');
        assert.equal(price.next.tax, '0.00');
        done();
      });
  });

  it('should not apply tax if plan is tax exempt and not usst', function (done) {
    pricing
      .plan('tax_exempt', { quantity: 1 })
      .address({
        country: 'GB'
      })
      .done(function (price) {
        assert.equal(price.taxes.length, 0);
        assert.equal(price.now.tax, '0.00');
        assert.equal(price.next.tax, '0.00');
        done();
      });
  });

  it('should append US tax elements in the US', function (done) {
    pricing
      .plan('basic', { quantity: 1 })
      .address({
        country: 'US',
        postal_code: '94110' // tax literal for test
      })
      .done(function (price) {
        assert.equal(price.taxes.length, 1);
        assert.equal(price.taxes[0].type, 'us');
        assert.equal(price.taxes[0].rate, '0.0875');
        assert.equal(price.now.tax, '0.18');
        assert.equal(price.next.tax, '1.75');
        done();
      });
  });

  it('should append VAT tax elements if in the EU', function (done) {
    pricing
      .plan('basic', { quantity: 1 })
      .address({
        country: 'DE'
      })
      .done(function (price) {
        assert.equal(price.taxes.length, 1);
        assert.equal(price.taxes[0].type, 'vat');
        assert.equal(price.taxes[0].rate, '0.015');
        assert.equal(price.now.tax, '0.03');
        assert.equal(price.next.tax, '0.30');
        done();
      });
  });

  it('should append US state tax, similar to 2015 VAT regulations', function (done) {
    pricing
      .plan('basic', { quantity: 1 })
      .address({
        country: 'US',
        postal_code: '94129' // tax literal for test
      })
      .done(function (price) {
        assert.equal(price.taxes.length, 1);
        assert.equal(price.taxes[0].type, 'us');
        assert.equal(price.taxes[0].rate, '0.0875');
        assert.equal(price.taxes[0].region, 'CA');
        assert.equal(price.now.tax, '0.18');
        assert.equal(price.next.tax, '1.75');
        done();
      });
  });

  it('should append VAT tax elements if in the EU and region for 2015 type rules', function (done) {
    pricing
      .plan('basic', { quantity: 1 })
      .address({
        country: 'GB'
      })
      .done(function (price) {
        assert.equal(price.taxes.length, 1);
        assert.equal(price.taxes[0].type, 'vat');
        assert.equal(price.taxes[0].region, 'GB');
        assert.equal(price.taxes[0].rate, '0.2');
        assert.equal(price.now.tax, '0.40');
        assert.equal(price.next.tax, '4.00');
        done();
      });
  });

  it('should append 20 pct. of 49.00 to have a correct tax of $9.80', function (done) {
    pricing
      .plan('intermediate', { quantity: 1 })
      .address({
        country: 'GB'
      })
      .done(function (price) {
        assert.equal(price.taxes.length, 1);
        assert.equal(price.taxes[0].type, 'vat');
        assert.equal(price.taxes[0].region, 'GB');
        assert.equal(price.taxes[0].rate, '0.2');
        assert.equal(price.now.tax, '0.40');
        assert.equal(price.next.tax, '9.80');
        done();
      });
  });

  describe('with applied coupon', function () {
    it('should apply multi-use coupon correctly', function (done) {
      pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop')
        .done(function (price) {
          assert.equal(price.now.discount, '20.00');
          assert.equal(price.next.discount, '20.00');
          done();
        });
    });

    it('should apply single-use coupon correctly', function (done) {
      pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop-single-use')
        .done(function (price) {
          assert.equal(price.now.discount, '20.00');
          assert.equal(price.next.discount, '0.00');
          done();
        });
    });
  });
});
