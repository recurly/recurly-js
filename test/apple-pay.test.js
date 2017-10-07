import assert from 'assert';
import clone from 'component-clone';
import merge from 'lodash.merge';
import omit from 'lodash.omit';
import Emitter from 'component-emitter';
import {Recurly} from '../lib/recurly';
import {initRecurly, apiTest, nextTick} from './support/helpers';

import infoFixture from './server/fixtures/apple_pay/info';
import startFixture from './server/fixtures/apple_pay/start';
import tokenFixture from './server/fixtures/apple_pay/token';

class ApplePaySessionStub extends Emitter {
  constructor () {
    super();
    return this;
  }
  begin () {}
  completeMerchantValidation (ms) {
    this.merchantSession = ms;
    this.emit('completeMerchantValidation');
  }
  completePaymentMethodSelection (t, li) {
    this.total = t;
    this.lineItems = li;
    this.emit('completePaymentMethodSelection');
  }
  completePayment (status) {
    this.status = status;
    this.emit('completePayment');
  }
};
ApplePaySessionStub.canMakePayments = () => true;

apiTest(function (requestMethod) {
  describe(`Recurly.ApplePay (${requestMethod})`, function () {
    let validOpts = {
      country: 'US',
      currency: 'USD',
      label: 'Apple Pay test',
      total: '3.49',
      form: {}
    };

    beforeEach(function () {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      global.ApplePaySession = ApplePaySessionStub;
    });

    afterEach(() => delete global.ApplePaySession);

    describe('Constructor', function () {
      describe('when Apple Pay is not supported', function () {
        beforeEach(function () {
          delete global.ApplePaySession;
          this.applePay = this.recurly.ApplePay(validOpts);
        });

        it('registers an Apple Pay not supported error', function () {
          assertInitError(this.applePay, 'apple-pay-not-supported');
        });

        describe('ApplePay.begin', function () {
          it('returns an initialization error', function () {
            let result = this.applePay.begin();
            assert.equal(result.code, 'apple-pay-init-error');
            assert.equal(result.err.code, 'apple-pay-not-supported');
          });
        });
      });

      describe('when Apple Pay is not set up', function () {
        let originalMethod = ApplePaySessionStub.canMakePayments;
        beforeEach(function () {
          ApplePaySessionStub.canMakePayments = () => false;
          this.applePay = this.recurly.ApplePay(omit(validOpts, 'label'));
        });
        afterEach(function () {
          ApplePaySessionStub.canMakePayments = originalMethod;
        });

        it('registers an Apple Pay not available error', function () {
          assertInitError(this.applePay, 'apple-pay-not-available');
        });

        describe('ApplePay.begin', function () {
          it('returns an initialization error', function () {
            let result = this.applePay.begin();
            assert.equal(result.code, 'apple-pay-init-error');
            assert.equal(result.err.code, 'apple-pay-not-available');
          });
        });
      });

      it('requires options.form', function () {
        let applePay = this.recurly.ApplePay(omit(validOpts, 'form'));
        assertInitError(applePay, 'apple-pay-config-missing', { opt: 'form' });
      });

      it('requires options.label', function () {
        let applePay = this.recurly.ApplePay(omit(validOpts, 'label'));
        assertInitError(applePay, 'apple-pay-config-missing', { opt: 'label' });
      });

      describe('when not given options.pricing', function () {
        it('requires options.total', function () {
          let applePay = this.recurly.ApplePay(omit(validOpts, 'total'));
          assertInitError(applePay, 'apple-pay-config-missing', { opt: 'total' });
        });

        it('stores options.total', function (done) {
          let applePay = this.recurly.ApplePay(clone(validOpts));
          applePay.ready(() => {
            assert.equal(applePay.config.total, validOpts.total)
            done();
          });
        });
      });

      describe('when given options.pricing', function () {
        beforeEach(function () {
          let pricing = this.pricing = this.recurly.Pricing();
          this.applePay = this.recurly.ApplePay(merge(omit(validOpts, 'total'), { pricing }))
        });

        it('binds a pricing instance', function (done) {
          this.applePay.ready(() => {
            assert(this.applePay.config.pricing === this.pricing);
            done();
          });
        });

        it('ignores options.total', function (done) {
          this.applePay.ready(() => {
            assert(!('total' in this.applePay.config));
            done();
          });
        });
      });

      it('requires a valid country', function (done) {
        const invalid = 'DE';
        let applePay = this.recurly.ApplePay(merge({}, validOpts, { country: invalid }));
        applePay.on('error', (err) => {
          nextTick(() => {
            assertInitError(applePay, 'apple-pay-config-invalid', { opt: 'country' });
            done();
          });
        });
      });

      it('requires a valid currency', function (done) {
        const invalid = 'EUR';
        let applePay = this.recurly.ApplePay(merge({}, validOpts, { currency: invalid }));
        applePay.on('error', (err) => {
          nextTick(() => {
            assertInitError(applePay, 'apple-pay-config-invalid', { opt: 'currency' });
            done();
          });
        });
      });

      describe('merchant info collection', function () {
        beforeEach(function () {
          this.applePay = this.recurly.ApplePay(validOpts);
        });

        it('assigns merchantCapabilities', function (done) {
          this.applePay.ready(() => {
            assert.deepEqual(this.applePay.config.merchantCapabilities, infoFixture.merchantCapabilities);
            done();
          });
        });

        it('assigns supportedNetworks', function (done) {
          this.applePay.ready(() => {
            assert.deepEqual(this.applePay.config.supportedNetworks, infoFixture.supportedNetworks);
            done();
          });
        });
      });

      it('emits ready when done', function (done) {
        this.recurly.ApplePay(validOpts).on('ready', done);
      });
    });

    describe('ApplePay.ready', function () {
      it('calls the callback once instantiated', function (done) {
        this.recurly.ApplePay(validOpts).ready(done);
      });
    });

    describe('ApplePay.begin', function () {
      it('aborts if there is an initError', function () {
        // expect empty options to induce an initError
        let applePay = this.recurly.ApplePay();
        let result = applePay.begin();
        assert(result instanceof Error);
        assert.equal(result.code, 'apple-pay-init-error');
        assert.equal(result.err.code, applePay.initError.code);
      });

      it('establishes a session and initiates it', function () {
        let applePay = this.recurly.ApplePay(validOpts);
        applePay.begin();
        assert(applePay.session instanceof ApplePaySessionStub);
      });
    });

    describe('onPricingChange', function () {
      beforeEach(function () {
        this.pricing = this.recurly.Pricing();
      });

      it('updates the total to reflect Pricing changes', function (done) {
        let applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing: this.pricing }));
        let originalTotal = clone(applePay.total);
        this.pricing.on('change', () => {
          assert.notDeepEqual(originalTotal, applePay.total);
          done();
        });
        this.pricing.plan('basic', { quantity: 1 }).done();
      });
    });

    describe('mapPaymentData', function () {
      let applePayData = {
        token: {
          paymentData: 'apple pay token',
          paymentMethod: 'card info'
        },
        billingContact: {
          givenName: 'Emmet',
          familyName: 'Brown',
          addressLines: ['1640 Riverside Drive', 'Suite 1'],
          locality: 'Hill Valley',
          administrativeArea: 'CA',
          postalCode: '91103',
          countryCode: 'us'
        }
      };
      let inputs = {};

      it('maps the apple pay token and address info into the inputs', function () {
        let applePay = this.recurly.ApplePay();
        let data = clone(applePayData);
        applePay.mapPaymentData(inputs, data);
        assert.equal('apple pay token', inputs.paymentData);
        assert.equal('card info', inputs.paymentMethod);
        assert.equal('Emmet', inputs.first_name);
        assert.equal('Brown', inputs.last_name);
        assert.equal('1640 Riverside Drive', inputs.address1);
        assert.equal('Suite 1', inputs.address2);
        assert.equal('Hill Valley', inputs.city);
        assert.equal('CA', inputs.state);
        assert.equal('91103', inputs.postal_code);
        assert.equal('us', inputs.country);
      });

      it('prioritizes existing input data from the payment form', function () {
        let applePay = this.recurly.ApplePay();
        let data = clone(applePayData);
        let inputs = {
          first_name: 'Marty',
          last_name: 'McFly'
        };
        applePay.mapPaymentData(inputs, data);
        assert.equal('apple pay token', inputs.paymentData);
        assert.equal('card info', inputs.paymentMethod);
        assert.equal('Marty', inputs.first_name);
        assert.equal('McFly', inputs.last_name);
        assert.equal('1640 Riverside Drive', inputs.address1);
        assert.equal('Suite 1', inputs.address2);
        assert.equal('Hill Valley', inputs.city);
        assert.equal('CA', inputs.state);
        assert.equal('91103', inputs.postal_code);
        assert.equal('us', inputs.country);
      });
    });

    describe('internal event handlers', function () {
      beforeEach(function (done) {
        this.applePay = this.recurly.ApplePay(validOpts);
        this.applePay.ready(() => {
          this.applePay.begin();
          done();
        });
      });

      describe('onValidateMerchant', function () {
        it('calls the merchant validation endpoint and passes the result to the ApplePaySession', function (done) {
          this.applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });
          this.applePay.session.on('completeMerchantValidation', () => {
            assert.equal(typeof this.applePay.session.merchantSession, 'object');
            assert.equal(this.applePay.session.merchantSession.merchantSessionIdentifier, startFixture.ok.merchantSessionIdentifier);
            done();
          });
        });
      });

      describe('onPaymentMethodSelected', function (done) {
        it('calls ApplePaySession.completePaymentSelection with a total and line items', function () {
          this.applePay.session.onpaymentmethodselected();
          this.applePay.session.on('completePaymentMethodSelection', () => {
            assert.equal(this.applePay.session.total, this.applePay.total);
            assert.equal(this.applePay.session.lineItems, this.applePay.lineItems);
            done();
          });
        });
      });

      describe('onPaymentAuthorized', function () {
        const validAuthorizeEvent = {
          payment: {
            token: {
              paymentData: 'valid-payment-data'
            }
          }
        };

        it('completes payment', function (done) {
          this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
          this.applePay.session.on('completePayment', () => {
            assert.equal(this.applePay.session.status, this.applePay.session.STATUS_SUCCESS);
            done();
          });
        });

        it('emits a token event', function (done) {
          this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
          this.applePay.on('token', token => {
            assert.deepEqual(token, tokenFixture.ok);
            done();
          });
        });

        describe('when payment data is invalid', function (done) {
          const invalidAuthorizeEvent = {
            payment: {
              token: {
                paymentData: 'invalid-payment-data'
              }
            }
          };

          it('completes payment with a failure code', function (done) {
            this.applePay.session.onpaymentauthorized(clone(invalidAuthorizeEvent));
            this.applePay.session.on('completePayment', () => {
              assert.equal(this.applePay.session.status, this.applePay.session.STATUS_FAILURE);
              done();
            });
          });

          it('emits an error event', function (done) {
            this.applePay.session.onpaymentauthorized(clone(invalidAuthorizeEvent));
            this.applePay.on('error', err => {
              assert.equal(err.code, tokenFixture.error.error.code);
              assert.equal(err.message, tokenFixture.error.error.message);
              done();
            });
          });
        });
      });
    });
  });
});

function assertInitError(applePay, code, other) {
  assert.equal(applePay._ready, false);
  assert.equal(applePay.initError.code, code);
  if (other) {
    for (let prop in other) {
      if (other.hasOwnProperty(prop)) {
        assert.equal(applePay.initError[prop], other[prop]);
      }
    }
  }
}
