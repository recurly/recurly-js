import assert from 'assert';
import clone from 'component-clone';
import find from 'component-find';
import merge from 'lodash.merge';
import omit from 'lodash.omit';
import Emitter from 'component-emitter';
import Promise from 'promise';
import { initRecurly, apiTest, nextTick } from './support/helpers';
import { ApplePayBraintree } from '../../lib/recurly/apple-pay/apple-pay.braintree';

import infoFixture from '../server/fixtures/apple_pay/info';
import startFixture from '../server/fixtures/apple_pay/start';
import tokenFixture from '../server/fixtures/apple_pay/token';

const INTEGRATION = {
  DIRECT: 'Direct Integration',
  BRAINTREE: 'Braintree Integration',
};

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
  completePaymentMethodSelection ({ newTotal: t, newLineItems: li }) {
    this.total = t;
    this.lineItems = li;
    this.emit('completePaymentMethodSelection');
  }
  completeShippingContactSelection ({ newTotal: t, newLineItems: li, newShippingMethods: sm }) {
    this.shippingMethods = sm;
    this.total = t;
    this.lineItems = li;
    this.emit('completeShippingContactSelection');
  }
  completeShippingMethodSelection ({ newTotal: t, newLineItems: li }) {
    this.total = t;
    this.lineItems = li;
    this.emit('completeShippingMethodSelection');
  }
  completePayment ({ status }) {
    this.status = status;
    this.emit('completePayment');
  }
};
ApplePaySessionStub.canMakePayments = () => true;
ApplePaySessionStub.supportsVersion = () => true;

const getBraintreeStub = () => ({
  client: {
    VERSION: '3.76.0',
    create: sinon.stub().resolves('CLIENT'),
  },
  dataCollector: {
    create: sinon.stub().resolves({ deviceData: 'DEVICE_DATA' }),
  },
  applePay: {
    create: sinon.stub().resolves({
      performValidation: sinon.stub().resolves('MERCHANT_SESSION'),
      tokenize: sinon.stub().resolves('TOKENIZED_PAYLOAD'),
      teardown: sinon.stub().resolves('TEARDOWN'),
    }),
  },
});

apiTest(applePayTest.bind(null, INTEGRATION.DIRECT));
apiTest(applePayTest.bind(null, INTEGRATION.BRAINTREE));

function applePayTest (integrationType, requestMethod) {
  const isDirectIntegration = integrationType === INTEGRATION.DIRECT;
  const isBraintreeIntegration = integrationType === INTEGRATION.BRAINTREE;

  describe(`Recurly.ApplePay ${integrationType} (${requestMethod})`, function () {
    let validOpts = {
      country: 'US',
      currency: 'USD',
      label: 'Apple Pay test',
      total: '3.49',
      form: {},
      ...(isBraintreeIntegration && { braintree: { clientAuthorization: 'valid' } }),
    };

    beforeEach(function () {
      this.sandbox = sinon.createSandbox();
      this.isIE = !!document.documentMode;
      if (this.isIE) {
        window.Promise = Promise;
      }
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      window.ApplePaySession = ApplePaySessionStub;
      if (isBraintreeIntegration) {
        window.braintree = getBraintreeStub();
      }
    });

    afterEach(function () {
      this.sandbox.restore();
      if (this.isIE) {
        delete window.Promise;
      }
      delete window.ApplePaySession;
      delete window.braintree;
    });

    describe('Constructor', function () {
      describe('when Apple Pay is not supported', function () {
        beforeEach(function () {
          delete window.ApplePaySession;
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
        beforeEach(function () {
          this.sandbox.stub(ApplePaySessionStub, 'canMakePayments').returns(false);
          this.applePay = this.recurly.ApplePay(omit(validOpts, 'label'));
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

      describe('when Apple Pay version not supported', function () {
        beforeEach(function () {
          this.sandbox.stub(ApplePaySessionStub, 'supportsVersion').returns(false);
          this.applePay = this.recurly.ApplePay(omit(validOpts, 'label'));
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

      it('requires options.label', function (done) {
        let applePay = this.recurly.ApplePay(omit(validOpts, 'label'));

        applePay.on('error', function (err) {
          nextTick(() => {
            assert.equal(err, applePay.initError);
            assertInitError(applePay, 'apple-pay-config-missing', { opt: 'label' });
            done();
          });
        });
      });

      describe('when not given options.pricing', function () {
        it('requires options.total', function (done) {
          let applePay = this.recurly.ApplePay(omit(validOpts, 'total'));
          applePay.on('error', function (err) {
            nextTick(() => {
              assert.equal(err, applePay.initError);
              assertInitError(applePay, 'apple-pay-config-missing', { opt: 'total' });
              done();
            });
          });
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
          const pricing = this.pricing = this.recurly.Pricing.Checkout();
          this.applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing }));
        });

        it('binds a pricing instance', function (done) {
          this.applePay.ready(() => {
            assert.strictEqual(this.applePay.config.pricing, this.pricing);
            done();
          });
        });

        it('ignores options.total', function (done) {
          this.applePay.ready(() => {
            assert.notEqual(this.applePay.config.total, validOpts.total);
            done();
          });
        });

        describe('when options.pricing is a PricingPromise', () => {
          beforeEach(function () {
            const { recurly } = this;
            const pricing = this.pricing = recurly.Pricing.Checkout();
            const pricingPromise = this.pricingPromise = pricing.reprice();
            this.applePay = recurly.ApplePay(merge({}, validOpts, { pricing: pricingPromise }));
          });

          it('uses the underlying Pricing instance', function (done) {
            const { pricingPromise, pricing, applePay } = this;
            applePay.ready(() => {
              assert.strictEqual(applePay.config.pricing, pricing);
              assert.strictEqual(applePay.config.total, pricing.totalNow);
              assert.strictEqual(applePay.config.total, '0.00');

              pricing.adjustment({ amount: 10 }).done(() => {
                assert.strictEqual(applePay.config.total, pricing.totalNow);
                assert.strictEqual(applePay.config.total, '10.00');
                done();
              });
            });
          });
        });

        describe('when the pricing instance includes several items', () => {
          beforeEach(function (done) {
            this.timeout(10000);
            this.subscription = this.recurly.Pricing.Subscription()
              .plan('basic')
              .address({ country: 'US', postalCode: '94117' })
              .done(() => {
                this.pricing
                  .subscription(this.subscription)
                  .adjustment({ amount: 100 })
                  .coupon('coop')
                  .giftCard('super-gift-card')
                  .done(() => done());
              });
          });

          it('includes relevant line items', function () {
            const subtotal = this.applePay.lineItems[0];
            const discount = this.applePay.lineItems[1];
            const giftCard = this.applePay.lineItems[2];
            const total = this.applePay.totalLineItem;
            assert.strictEqual(this.applePay.lineItems.length, 3);
            assert.strictEqual(subtotal.label, this.applePay.config.i18n.subtotalLineItemLabel);
            assert.strictEqual(discount.label, this.applePay.config.i18n.discountLineItemLabel);
            assert.strictEqual(giftCard.label, this.applePay.config.i18n.giftCardLineItemLabel);
            assert.strictEqual(subtotal.amount, '121.99');
            assert.strictEqual(discount.amount, '-20.00');
            assert.strictEqual(giftCard.amount, '-20.00');
            assert.strictEqual(total.amount, '81.99');
          });

          describe('when the line item labels are customized', () => {
            beforeEach(function () {
              this.exampleI18n = {
                authorizationLineItemLabel: 'Custom card authorization label',
                subtotalLineItemLabel: 'Custom subtotal label',
                discountLineItemLabel: 'Custom discount label',
                taxLineItemLabel: 'Custom tax label',
                giftCardLineItemLabel: 'Custom Gift card label'
              };
            });

            it('displays those labels', function (done) {
              const applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing: this.pricing, i18n: this.exampleI18n }));
              applePay.on('ready', () => {
                const subtotal = applePay.lineItems[0];
                const discount = applePay.lineItems[1];
                const giftCard = applePay.lineItems[2];
                assert.equal(subtotal.label, this.exampleI18n.subtotalLineItemLabel);
                assert.equal(discount.label, this.exampleI18n.discountLineItemLabel);
                assert.equal(giftCard.label, this.exampleI18n.giftCardLineItemLabel);
                done();
              });
            });
          });

          describe('when the total price is zero', () => {
            beforeEach(function (done) {
              this.pricing.coupon('coop-fixed-all-500').done(() => done());
            });

            it('adds an authorization line item', function () {
              assert.strictEqual(this.applePay.totalLineItem.amount, '0.00');
              this.applePay.begin();
              const authorization = this.applePay.lineItems[2];
              assert.strictEqual(authorization.label, this.applePay.config.i18n.authorizationLineItemLabel);
              assert.strictEqual(authorization.amount, '1.00');
              assert.strictEqual(this.applePay.totalLineItem.amount, '1.00');
            });
          });

          describe('when tax amounts are specified', () => {
            beforeEach(function (done) {
              this.pricing.tax({ amount: { now: 20.01, next: 18.46 } }).done(() => done());
            });

            it('sets the tax line item accordingly', function () {
              const taxLineItem = find(this.applePay.lineItems, li => li.label === this.applePay.config.i18n.taxLineItemLabel);
              assert.strictEqual(taxLineItem.amount, '20.01');
            });
          });
        });
      });

      it('requires a valid country', function (done) {
        const invalid = 'DE';
        let applePay = this.recurly.ApplePay(merge({}, validOpts, { country: invalid }));
        applePay.on('error', (err) => {
          nextTick(() => {
            assert.equal(err, applePay.initError);
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
            assert.equal(err, applePay.initError);
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

      if (isBraintreeIntegration) {
        describe('when the libs are not loaded', function () {
          beforeEach(function () {
            delete window.braintree;
            this.sandbox.stub(ApplePayBraintree, 'libUrl').returns('/api/mock-200');
          });

          it('load the libs', function (done) {
            const applePay = this.recurly.ApplePay(validOpts);
            applePay.on('error', () => {
              assert.equal(ApplePayBraintree.libUrl.callCount, 3);
              assert.equal(ApplePayBraintree.libUrl.getCall(0).args[0], 'client');
              assert.equal(ApplePayBraintree.libUrl.getCall(1).args[0], 'applePay');
              assert.equal(ApplePayBraintree.libUrl.getCall(2).args[0], 'dataCollector');
              done();
            });
          });
        });

        const requiredBraintreeLibs = ['client', 'dataCollector', 'applePay'];
        requiredBraintreeLibs.forEach(requiredLib => {
          describe(`when failed to load the braintree ${requiredLib} lib`, function () {
            beforeEach(function () {
              delete window.braintree;
              this.sandbox.stub(ApplePayBraintree, 'libUrl').withArgs(requiredLib).returns('/api/mock-404');
            });

            it('register an initialization error', function (done) {
              const applePay = this.recurly.ApplePay(validOpts);

              applePay.on('error', (err) => {
                nextTick(() => {
                  assert.equal(err, applePay.initError);
                  assertInitError(applePay, 'apple-pay-init-error');
                  done();
                });
              });
            });
          });

          describe(`when failed to create the ${requiredLib} instance`, function () {
            beforeEach(function () {
              window.braintree[requiredLib].create = sinon.stub().rejects('error');
            });

            it('register an initialization error', function (done) {
              const applePay = this.recurly.ApplePay(validOpts);

              applePay.on('error', (err) => {
                nextTick(() => {
                  assert.equal(err, applePay.initError);
                  assertInitError(applePay, 'apple-pay-init-error');
                  done();
                });
              });
            });
          });
        });

        it('assigns the braintree configuration', function (done) {
          const applePay = this.recurly.ApplePay(validOpts);

          applePay.on('ready', () => {
            nextTick(() => {
              assert.ok(applePay.braintree.dataCollector);
              assert.ok(applePay.braintree.applePay);
              done();
            });
          });
        });
      }
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

      it('establishes a session and initiates it', function (done) {
        let applePay = this.recurly.ApplePay(validOpts);
        applePay.on('ready', function () {
          applePay.begin();
          assert(applePay.session instanceof ApplePaySessionStub);
          done();
        });
      });

      it('establishes a session and initiates it without options.form', function (done) {
        let applePay = this.recurly.ApplePay(omit(validOpts, 'form'));
        applePay.on('ready', function () {
          applePay.begin();
          assert(applePay.session instanceof ApplePaySessionStub);
          done();
        });
      });
    });

    describe('onPricingChange', function () {
      beforeEach(function () {
        this.pricing = this.recurly.Pricing();
      });

      it('updates the total to reflect Pricing changes', function (done) {
        let applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing: this.pricing }));
        let originalTotal = clone(applePay.totalLineItem);
        this.pricing.on('change', () => {
          assert.notDeepEqual(originalTotal, applePay.totalLineItem);
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
      let inputsDefault = {
        first_name: '',
        last_name: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        tax_identifier: '',
        tax_identifier_type: '',
      };
      const inputAddressFields = {
        first_name: 'Marty',
        last_name: 'McFly',
        address1: 'Av 1',
        address2: 'Av 2',
        city: 'Versalles',
        state: 'Paris',
        postal_code: '123',
        country: 'fr',
      };
      const inputNotAddressFields = {
        tax_identifier: 'tax123',
        tax_identifier_type: 'cpf',
      };

      it('maps the apple pay token and address info into the inputs', function () {
        let applePay = this.recurly.ApplePay();
        let data = clone(applePayData);
        let inputs = clone(inputsDefault);
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
        assert.equal('', inputs.tax_identifier);
        assert.equal('', inputs.tax_identifier_type);
      });

      it('prioritizes existing input data from the payment form when contains any address info', function () {
        const applePay = this.recurly.ApplePay();
        const data = clone(applePayData);
        const addressFields = Object.keys(inputAddressFields);

        addressFields.forEach((key) => {
          const inputs = clone(inputsDefault);
          inputs[key] = inputAddressFields[key];
          applePay.mapPaymentData(inputs, data);

          assert.equal('apple pay token', inputs.paymentData);
          assert.equal('card info', inputs.paymentMethod);
          addressFields.forEach(k => assert.equal(k === key ? inputAddressFields[k] : '', inputs[k]));
        });
      });

      it('maps the apple pay data into the inputs when do not contains address info', function () {
        const applePay = this.recurly.ApplePay();
        const data = clone(applePayData);
        const inputs = clone(inputNotAddressFields);
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
        assert.equal('tax123', inputs.tax_identifier);
        assert.equal('cpf', inputs.tax_identifier_type);
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
        if (isDirectIntegration) {
          it('calls the merchant validation endpoint and passes the result to the ApplePaySession', function (done) {
            this.applePay.session.on('completeMerchantValidation', () => {
              assert.equal(typeof this.applePay.session.merchantSession, 'object');
              assert.equal(this.applePay.session.merchantSession.merchantSessionIdentifier, startFixture.ok.merchantSessionIdentifier);
              done();
            });
            this.applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });
          });
        }

        if (isBraintreeIntegration) {
          beforeEach(function () {
            this.spyStartRequest = this.sandbox.spy(this.recurly.request, 'post');
          });

          it('do not call the merchant validation start endpoint', function (done) {
            this.applePay.session.on('completeMerchantValidation', () => {
              assert.equal(this.spyStartRequest.called, false);
              done();
            });
            this.applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });
          });

          it('calls the braintree performValidation with the validation url', function (done) {
            this.applePay.session.on('completeMerchantValidation', () => {
              assert.ok(this.applePay.braintree.applePay.performValidation.calledWith({
                validationURL: 'valid-test-url',
                displayName: 'My Store'
              }));
              done();
            });
            this.applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });
          });

          it('calls the completeMerchantValidation with the merchant session', function (done) {
            const completeMerchantValidationSpy = this.sandbox.spy(this.applePay.session, 'completeMerchantValidation');
            this.applePay.session.on('completeMerchantValidation', () => {
              assert.ok(completeMerchantValidationSpy.calledWith('MERCHANT_SESSION'));
              done();
            });
            this.applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });
          });

          it('emits an error if the braintree performValidation fails', function (done) {
            this.applePay.braintree.applePay.performValidation = this.sandbox.stub().rejects('error');
            const completeMerchantValidationSpy = this.sandbox.spy(this.applePay.session, 'completeMerchantValidation');

            this.applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });

            this.applePay.on('error', err => {
              assert.equal(completeMerchantValidationSpy.called, false);
              assert.equal(err, 'error');
              done();
            });
          });
        }
      });

      describe('onPaymentMethodSelected', function () {
        it('calls ApplePaySession.completePaymentSelection with a total and line items', function (done) {
          this.applePay.session.on('completePaymentMethodSelection', () => {
            assert.deepEqual(this.applePay.session.total, this.applePay.finalTotalLineItem);
            assert.deepEqual(this.applePay.session.lineItems, this.applePay.lineItems);
            done();
          });
          this.applePay.session.onpaymentmethodselected();
        });
      });

      describe('onShippingContactSelected', function () {
        it('calls ApplePaySession.completeShippingContactSelection with empty methods, a total, and line items', function (done) {
          this.applePay.session.on('completeShippingContactSelection', () => {
            assert(Array.isArray(this.applePay.session.shippingMethods));
            assert.equal(this.applePay.session.shippingMethods.length, 0);
            assert.deepEqual(this.applePay.session.total, this.applePay.finalTotalLineItem);
            assert.deepEqual(this.applePay.session.lineItems, this.applePay.lineItems);
            done();
          });
          this.applePay.session.onshippingcontactselected();
        });

        it('emits shippingContactSelected', function (done) {
          const example = { test: 'event' };
          this.applePay.on('shippingContactSelected', event => {
            assert.deepEqual(event, example);
            done();
          });
          this.applePay.session.onshippingcontactselected(example);
        });
      });

      describe('onShippingMethodSelected', function () {
        it('calls ApplePaySession.completeShippingMethodSelection with status, a total, and line items', function (done) {
          this.applePay.session.on('completeShippingContactSelection', () => {
            assert(Array.isArray(this.applePay.session.shippingMethods));
            assert.equal(this.applePay.session.shippingMethods.length, 0);
            assert.deepEqual(this.applePay.session.total, this.applePay.finalTotalLineItem);
            assert.deepEqual(this.applePay.session.lineItems, this.applePay.lineItems);
            done();
          });
          this.applePay.session.onshippingcontactselected();
        });

        it('emits shippingMethodSelected', function (done) {
          const example = { test: 'event' };
          this.applePay.on('shippingMethodSelected', event => {
            assert.deepEqual(event, example);
            done();
          });
          this.applePay.session.onshippingmethodselected(example);
        });
      });

      describe('onPaymentAuthorized', function () {
        const validAuthorizeEvent = {
          payment: {
            token: {
              paymentData: 'valid-payment-data',
              paymentMethod: 'valid-payment-method'
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

        it('emits paymentAuthorized', function (done) {
          const example = clone(validAuthorizeEvent);
          this.applePay.on('paymentAuthorized', event => {
            assert.deepEqual(event, example);
            done();
          });
          this.applePay.session.onpaymentauthorized(example);
        });

        if (isDirectIntegration) {
          it('pass the expected parameters to create the token', function (done) {
            this.spyTokenRequest = this.sandbox.spy(this.recurly.request, 'post');

            this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
            this.applePay.on('token', () => {
              const args = this.spyTokenRequest.getCall(0).args[0];
              assert.deepEqual(args.data, {
                paymentData: 'valid-payment-data',
                paymentMethod: 'valid-payment-method',
              });
              done();
            });
          });
        }

        if (isBraintreeIntegration) {
          it('pass the expected parameters to create the token', function (done) {
            this.spyTokenRequest = this.sandbox.spy(this.recurly.request, 'post');

            this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
            this.applePay.on('token', () => {
              const args = this.spyTokenRequest.getCall(0).args[0];
              assert.deepEqual(args.data, {
                type: 'braintree',
                payload: {
                  deviceData: 'DEVICE_DATA',
                  tokenizePayload: 'TOKENIZED_PAYLOAD',
                  applePayPayment: {
                    paymentData: 'valid-payment-data',
                    paymentMethod: 'valid-payment-method',
                  },
                }
              });
              done();
            });
          });
        }

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

      describe('onCancel', function () {
        it('emits onCancel', function (done) {
          const example = { test: 'event' };
          this.applePay.on('cancel', event => {
            assert.deepEqual(event, example);
            done();
          });
          this.applePay.session.oncancel(example);
        });

        if (isBraintreeIntegration) {
          it('teardown braintree', function (done) {
            this.applePay.on('cancel', () => {
              assert.ok(this.applePay.braintree.applePay.teardown.called);
              done();
            });
            this.applePay.session.oncancel('event');
          });
        }
      });
    });

    describe('Authorization line item', () => {
      it('has a customizable label', function () {
        const example = 'Test auth label';
        const applePay = this.recurly.ApplePay(Object.assign({}, validOpts, {
          i18n: { authorizationLineItemLabel: example }
        }));
        applePay.authorizationLineItem.label === example;
      });

      describe('when the total price is greater than zero', function () {
        beforeEach(function (done) {
          this.applePay = this.recurly.ApplePay(validOpts);
          this.applePay.ready(() => {
            this.applePay.begin();
            done();
          });
        });

        it('is not present', function () {
          assert.equal(this.applePay.config.total, 3.49);
          assert.equal(this.applePay.lineItems.length, 0);
        });
      });

      describe('when the total price is zero', function () {
        beforeEach(function (done) {
          this.applePay = this.recurly.ApplePay(Object.assign({}, validOpts, {
            total: 0
          }));
          this.applePay.ready(() => {
            this.applePay.begin();
            done();
          });
        });

        it('is present', function () {
          assert.equal(this.applePay.config.total, 1);
          assert.equal(this.applePay.lineItems.length, 1);
          assert.deepEqual(this.applePay.lineItems[0], this.applePay.authorizationLineItem);
        });
      });
    });
  });
}

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
