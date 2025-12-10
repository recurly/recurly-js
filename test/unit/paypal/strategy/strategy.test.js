import assert from 'assert';
import each from 'component-each';
import merge from 'lodash.merge';
import { initRecurly, stubBraintree } from '../../support/helpers';

describe('PayPalStrategy', function () {
  const validOpts = {};

  stubBraintree();

  beforeEach(function () {
    this.recurly = initRecurly();
    this.paypal = this.recurly.PayPal(validOpts);
  });

  afterEach(function () {
    this.recurly.destroy();
  });

  describe('when given custom display options', function () {
    const validDisplayOptions = {
      amount: '100.0',
      currency: 'EUR',
      displayName: 'Test item',
      locale: 'en_AU',
      enableShippingAddress: true,
      shippingAddressOverride: null,
      shippingAddressEditable: false,
      billingAgreementDescription: 'We agree that this is a test.',
      landingPageType: 'billing'
    };

    beforeEach(function () {
      this.paypal = this.recurly.PayPal(merge({}, validOpts, {
        display: merge({}, validDisplayOptions, { invalidOption: 'test-value' })
      }));
    });

    it('stores valid display options', function () {
      assert.equal(typeof this.paypal.strategy.config.display, 'object');
      each(validDisplayOptions, (opt, val) => {
        assert.equal(opt in this.paypal.strategy.config.display, true);
        assert.equal(this.paypal.strategy.config.display[opt], val);
      });
    });

    it('Does not store invalid display options', function () {
      assert.equal('invalidOption' in this.paypal.strategy.config.display, false);
    });
  });

  describe('when given a pricing instance', function () {
    beforeEach(function () {
      this.pricing = this.recurly.Pricing();
      this.paypal = this.recurly.PayPal({ pricing: this.pricing });
    });

    it('updates display properties when pricing changes', function (done) {
      assert.equal(this.paypal.strategy.config.display.amount, 0);
      this.pricing.plan('basic').done(price => {
        assert.notEqual(this.paypal.strategy.config.display.amount, 0);
        assert.equal(this.paypal.strategy.config.display.amount, price.now.total);
        assert.equal(this.paypal.strategy.config.display.currency, price.currency.code);
        done();
      });
    });
  });
});
