import assert from 'assert';
import each from 'component-each';
import merge from 'lodash.merge';
import {Recurly} from '../../lib/recurly';
import {initRecurly, apiTest, braintreeStub} from '../support/helpers';

const sinon = window.sinon;

apiTest(function (requestMethod) {
  describe(`Recurly.BraintreePayPal (${requestMethod})`, function () {
    const validOpts = { braintree: { clientAuthorization: 'valid' } };

    braintreeStub();

    beforeEach(function () {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.paypal = this.recurly.PayPal(validOpts);
    });

    describe('when given custom display options', function () {
      const validDisplayOptions = {
        useraction: 'commit',
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
        assert.equal(typeof this.paypal.config.display, 'object');
        each(validDisplayOptions, (opt, val) => {
          assert.equal(opt in this.paypal.config.display, true);
          assert.equal(this.paypal.config.display[opt], val);
        });
      });

      it('Does not store invalid display options', function () {
        assert.equal('invalidOption' in this.paypal.config.display, false);
      });
    });

    describe('when given a pricing instance', function () {
      beforeEach(function () {
        this.pricing = this.recurly.Pricing();
        this.paypal = this.recurly.PayPal({ pricing: this.pricing });
      });

      it('updates display properties when pricing changes', function (done) {
        assert.equal(typeof this.paypal.config.display.amount, 'undefined');
        this.pricing.plan('basic').done(price => {
          assert.equal(this.paypal.config.display.amount, price.now.total);
          assert.equal(this.paypal.config.display.currency, price.currency.code);
          done();
        });
      });
    });

    describe('when the braintree client fails to initialize', function () {
      beforeEach(function () {
        global.braintree.client.create = (opt, cb) => cb({ error: 'test' });
        sinon.stub(this.recurly, 'open');
        this.paypal = this.recurly.PayPal(validOpts);
      });

      afterEach(function () {
        this.recurly.open.restore();
      });

      it('registers a failure and falls back to direct PayPal flow', function () {
        this.paypal.start();
        assert('failure' in this.paypal);
        assert(this.recurly.open.calledOnce);
        assert(this.recurly.open.calledWith('/paypal/start'));
      });
    });
  });
});
