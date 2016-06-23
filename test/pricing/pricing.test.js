import assert from 'assert';
import {Recurly} from '../../lib/recurly';
import {initRecurly} from '../support/helpers';

describe('Recurly.Pricing', function () {
  beforeEach(function () {
    this.recurly = initRecurly();
    this.pricing = this.recurly.Pricing();
  });

  describe('with taxation', () => {
    it('should not append tax elements if there is no tax', function (done) {
      this.pricing
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
      this.pricing
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
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: '94110' // tax literal for test
        })
        .done(function (price) {
          assert.equal(price.taxes.length, 1);
          assert.equal(price.taxes[0].type, 'us');
          assert.equal(price.taxes[0].rate, '0.0875');
          assert.equal(price.now.tax, '1.93');
          assert.equal(price.next.tax, '1.75');
          done();
        });
    });

    it('should append VAT tax elements if in the EU', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'DE'
        })
        .done(function (price) {
          assert.equal(price.taxes.length, 1);
          assert.equal(price.taxes[0].type, 'vat');
          assert.equal(price.taxes[0].rate, '0.015');
          assert.equal(price.now.tax, '0.33');
          assert.equal(price.next.tax, '0.30');
          done();
        });
    });

    it('should append US state tax, similar to 2015 VAT regulations', function (done) {
      this.pricing
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
          assert.equal(price.now.tax, '1.93');
          assert.equal(price.next.tax, '1.75');
          done();
        });
    });

    it('should append VAT tax elements if in the EU and region for 2015 type rules', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'GB'
        })
        .done(function (price) {
          assert.equal(price.taxes.length, 1);
          assert.equal(price.taxes[0].type, 'vat');
          assert.equal(price.taxes[0].region, 'GB');
          assert.equal(price.taxes[0].rate, '0.2');
          assert.equal(price.now.tax, '4.40');
          assert.equal(price.next.tax, '4.00');
          done();
        });
    });

    it('should append 20 pct. of 49.00 to have a correct tax of $9.80', function (done) {
      this.pricing
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
  });

  describe('with usage addons', function() {
    it('shouldnt apply the usage cost to the price', function (done) {
      this.pricing
        .plan('basic', {quantity: 1})
        .addon('snarf')
        .addon('with_usage')
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .done(function (price) {
          assert.equal(price.now.addons,"1.00")
          assert.equal(price.next.addons,"1.00")
          assert.equal(price.now.total,"22.99")
          assert.equal(price.next.total,"20.99")
          done();
        });
    });
  });

  describe('with coupons', function () {
    it('should apply a multi-use coupon correctly', function (done) {
      this.pricing
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

    it('should apply a single-use coupon correctly', function (done) {
      this.pricing
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

    it('should apply a trial extension coupon to a plan with a trial period', function (done) {
      this.pricing
        .plan('intermediate', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop-free-trial')
        .done(function (price) {
          assert.equal(price.now.plan, '0.00');
          assert.equal(price.now.addons, '0.00');
          assert.equal(price.now.discount, '0.00');
          assert.equal(price.next.discount, '0.00');
          done();
        });
    });

    it(`should apply a trial period when a trial extension coupon
        is applied to a plan without a trial period`, function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop-free-trial')
        .done(function (price) {
          assert.equal(price.now.plan, '0.00');
          assert.equal(price.now.addons, '0.00');
          assert.equal(price.now.discount, '0.00');
          assert.equal(price.next.discount, '0.00');
          done();
        });
    });
  });
});
