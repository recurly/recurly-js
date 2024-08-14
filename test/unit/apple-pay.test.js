import assert from 'assert';
import clone from 'component-clone';
import find from 'component-find';
import merge from 'lodash.merge';
import omit from 'lodash.omit';
import Emitter from 'component-emitter';
import Promise from 'promise';
import { initRecurly, nextTick } from './support/helpers';
import BraintreeLoader from '../../lib/util/braintree-loader';
import { ApplePayBraintree } from '../../lib/recurly/apple-pay/apple-pay.braintree';
import filterSupportedNetworks from '../../lib/recurly/apple-pay/util/filter-supported-networks';

const infoFixture = require('@recurly/public-api-test-server/fixtures/apple_pay/info');

const INTEGRATION = {
  DIRECT: 'Direct Integration',
  BRAINTREE: 'Braintree Integration',
};

class ApplePayError {
  constructor (code, contactField, message) {
    this.code = code;
    this.contactField = contactField;
    this.message = message;
  }
}

class ApplePaySessionStub extends Emitter {
  STATUS_FAILURE = 0;
  STATUS_SUCCESS = 1;

  constructor (version, paymentRequest) {
    super();
    this.version = version;
    Object.assign(this, paymentRequest);
  }
  begin () {}
  completeMerchantValidation (ms) {
    this.merchantSession = ms;
    this.emit('completeMerchantValidation');
  }
  completePaymentMethodSelection (update) {
    this.emit('completePaymentMethodSelection', update);
  }
  completeCouponCodeChange (update) {
    this.emit('completeCouponCodeChange', update);
  }
  completeShippingContactSelection (update) {
    this.emit('completeShippingContactSelection', update);
  }
  completeShippingMethodSelection (update) {
    this.emit('completeShippingMethodSelection', update);
  }
  completePayment (update) {
    this.emit('completePayment', update);
  }

  static version = 4;
  static supportsVersion (version) {
    if (!this.version) return true;
    return this.version >= version;
  }
}
ApplePaySessionStub.canMakePayments = () => true;

const getBraintreeStub = () => ({
  client: {
    VERSION: '3.101.0',
    create: sinon.stub().resolves('CLIENT'),
  },
  dataCollector: {
    create: sinon.stub().resolves({ deviceData: 'DEVICE_DATA' }),
  },
  applePay: {
    create: sinon.stub().resolves({
      performValidation: sinon.stub().resolves('MERCHANT_SESSION'),
      tokenize: sinon.stub().resolves('TOKENIZED_PAYLOAD'),
    }),
  },
});

describe('ApplePay', function () {
  beforeEach(function () {
    this.sandbox = sinon.createSandbox();
    window.ApplePaySession = ApplePaySessionStub;
    window.ApplePayError = ApplePayError;
  });

  afterEach(function () {
    this.sandbox.restore();
    delete window.ApplePaySession;
    delete window.ApplePayError;
  });

  describe('filterSupportedNetworks', function () {
    it('keeps networks that are compatible on the browser version', function () {
      this.sandbox.stub(ApplePaySessionStub, 'version').value(4);
      assert.deepEqual(filterSupportedNetworks(['visa', 'jcb', 'mir']), ['visa', 'jcb']);
    });

    it('rejects networks that are not compatible on the browser version', function () {
      this.sandbox.stub(ApplePaySessionStub, 'version').value(12);
      assert.deepEqual(filterSupportedNetworks(['visa', 'jcb', 'mir']), ['visa', 'jcb', 'mir']);
    });
  });

  applePayTest(INTEGRATION.DIRECT);
  applePayTest(INTEGRATION.BRAINTREE);
});

function applePayTest (integrationType) {
  const isDirectIntegration = integrationType === INTEGRATION.DIRECT;
  const isBraintreeIntegration = integrationType === INTEGRATION.BRAINTREE;

  describe(`Recurly.ApplePay ${integrationType}`, function () {
    let validOpts = {
      country: 'US',
      currency: 'USD',
      label: 'Apple Pay test',
      total: '3.49',
      form: {},
      ...(isBraintreeIntegration && { braintree: { clientAuthorization: 'valid' } }),
    };

    beforeEach(function () {
      this.recurly = initRecurly();
      if (isBraintreeIntegration) {
        window.braintree = getBraintreeStub();
      }
    });

    afterEach(function () {
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
          this.applePay = this.recurly.ApplePay(clone(validOpts));
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
          this.sandbox.stub(ApplePaySessionStub, 'version').value(2);
          this.applePay = this.recurly.ApplePay(clone(validOpts));
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

      it('sets options.label as the i18n total', function (done) {
        let options = omit(validOpts, 'label');
        options.label = 'Label';
        let applePay = this.recurly.ApplePay(options);

        applePay.ready(ensureDone(done, () => {
          assert.equal(applePay.config.i18n.totalLineItemLabel, options.label);
          assert.equal(applePay.config.i18n.totalLineItemLabel, 'Label');
        }));
      });

      describe('when not given options.pricing', function () {
        it('uses a $0 total when options.total is not provided', function (done) {
          let applePay = this.recurly.ApplePay(omit(validOpts, 'total'));
          applePay.ready(ensureDone(done, () => {
            assert.equal(applePay.session.total.amount, '0.00');
          }));
        });

        it('creates the total line item from options.total and the default options.label if absent', function (done) {
          let applePay = this.recurly.ApplePay(omit(validOpts, 'label'));
          applePay.ready(ensureDone(done, () => {
            assert.equal(applePay.session.total.amount, validOpts.total);
            assert.equal(applePay.session.total.label, applePay.config.i18n.totalLineItemLabel);
            assert.equal(applePay.session.total.label, 'Total');
          }));
        });

        it('creates the total line item from options.total and options.label', function (done) {
          let applePay = this.recurly.ApplePay(clone(validOpts));
          applePay.ready(ensureDone(done, () => {
            assert.equal(applePay.session.total.amount, validOpts.total);
            assert.equal(applePay.session.total.label, validOpts.label);
            assert.equal(applePay.session.label, undefined);
          }));
        });

        it('uses options.paymentRequest.total as the total line item', function (done) {
          let options = omit(validOpts, 'total');
          options.paymentRequest = { total: { label: 'Subscription', amount: '10.00' }, };
          let applePay = this.recurly.ApplePay(options);
          applePay.ready(ensureDone(done, () => {
            assert.equal(applePay.session.total, options.paymentRequest.total);
            assert.equal(applePay.session.recurringPaymentRequest, undefined);
          }));
        });
      });

      describe('when given options.pricing', function () {
        beforeEach(function () {
          const pricing = this.pricing = this.recurly.Pricing.Checkout();
          this.applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing }));
        });

        it('binds a pricing instance', function (done) {
          this.applePay.ready(ensureDone(done, () => {
            assert.strictEqual(this.applePay.config.pricing, this.pricing);
            assert.equal(this.applePay.session.pricing, undefined);
          }));
        });

        it('ignores options.total and options.lineItems', function (done) {
          const lineItems = [{ label: 'Taxes', amount: '10.00' }];
          this.applePay = this.recurly.ApplePay(merge({}, validOpts, {
            pricing: this.pricing,
            lineItems
          }));

          this.applePay.ready(ensureDone(done, () => {
            assert.notEqual(this.applePay.totalLineItem.amount, validOpts.total);
            assert.notDeepEqual(this.applePay.lineItems, lineItems);
          }));
        });

        describe('when options.pricing is a PricingPromise', () => {
          beforeEach(function () {
            const { recurly } = this;
            const pricing = this.pricing = recurly.Pricing.Checkout();
            const pricingPromise = this.pricingPromise = pricing.reprice();
            this.applePay = recurly.ApplePay(merge({}, validOpts, { pricing: pricingPromise }));
          });

          it('uses the underlying Pricing instance', function (done) {
            const { pricing, applePay } = this;
            applePay.ready(() => {
              assert.strictEqual(applePay.config.pricing, pricing);
              assert.strictEqual(applePay.totalLineItem.amount, pricing.totalNow);
              assert.strictEqual(applePay.totalLineItem.amount, '0.00');

              pricing.adjustment({ amount: 10 }).done(ensureDone(done, () => {
                assert.strictEqual(applePay.totalLineItem.amount, pricing.totalNow);
                assert.strictEqual(applePay.totalLineItem.amount, '10.00');
              }));
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
            assert.strictEqual(total.label, this.applePay.config.i18n.totalLineItemLabel);
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
                totalLineItemLabel: 'Custom total label',
                subtotalLineItemLabel: 'Custom subtotal label',
                discountLineItemLabel: 'Custom discount label',
                taxLineItemLabel: 'Custom tax label',
                giftCardLineItemLabel: 'Custom Gift card label'
              };
            });

            it('displays those labels', function (done) {
              const applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing: this.pricing, i18n: this.exampleI18n }));
              applePay.on('ready', ensureDone(done, () => {
                const total = applePay.totalLineItem;
                const subtotal = applePay.lineItems[0];
                const discount = applePay.lineItems[1];
                const giftCard = applePay.lineItems[2];
                assert.equal(total.label, this.exampleI18n.totalLineItemLabel);
                assert.equal(subtotal.label, this.exampleI18n.subtotalLineItemLabel);
                assert.equal(discount.label, this.exampleI18n.discountLineItemLabel);
                assert.equal(giftCard.label, this.exampleI18n.giftCardLineItemLabel);
                assert.equal(applePay.session.i18n, undefined);
              }));
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
          nextTick(ensureDone(done, () => {
            assert.equal(err, applePay.initError);
            assertInitError(applePay, 'apple-pay-config-invalid', { opt: 'country' });
          }));
        });
      });

      it('requires a valid currency', function (done) {
        const invalid = 'EUR';
        let applePay = this.recurly.ApplePay(merge({}, validOpts, { currency: invalid }));
        applePay.on('error', (err) => {
          nextTick(ensureDone(done, () => {
            assert.equal(err, applePay.initError);
            assertInitError(applePay, 'apple-pay-config-invalid', { opt: 'currency' });
          }));
        });
      });

      describe('options.enforceVersion', function () {
        it('returns an initError if the browser version for requiredShippingContactFields is not met', function (done) {
          this.sandbox.stub(ApplePaySessionStub, 'version').value(4);
          let applePay = this.recurly.ApplePay(merge({}, validOpts, {
            enforceVersion: true, paymentRequest: { requiredShippingContactFields: ['email'] },
          }));

          applePay.on('error', (err) => {
            nextTick(ensureDone(done, () => {
              assert.equal(err, applePay.initError);
              assertInitError(applePay, 'apple-pay-not-supported');
            }));
          });
        });

        it('sets requiredShippingContactFields if the browser version is met', function (done) {
          this.sandbox.stub(ApplePaySessionStub, 'version').value(14);
          let applePay = this.recurly.ApplePay(merge({}, validOpts, {
            enforceVersion: true, paymentRequest: { requiredShippingContactFields: ['email'] },
          }));

          applePay.ready(ensureDone(done, () => {
            assert.deepEqual(applePay.session.requiredShippingContactFields, ['email']);
          }));
        });
      });

      describe('recurringPaymentRequest', function () {
        it('is configured when the options.total is a recurring line item', function (done) {
          const applePay = this.recurly.ApplePay(merge({}, validOpts, {
            paymentRequest: { total: { label: 'Apple Pay testing', amount: '3.00', paymentTiming: 'recurring' }, },
          }));

          applePay.ready(ensureDone(done, () => {
            assert.deepEqual(applePay.session.recurringPaymentRequest, {
              paymentDescription: applePay.session.total.label,
              regularBilling: applePay.session.total,
              managementURL: infoFixture.managementURL,
              tokenNotificationURL: infoFixture.tokenNotificationURL,
            });
          }));
        });

        it('is configured when the options.recurring is set', function (done) {
          const applePay = this.recurly.ApplePay(merge({}, validOpts, { total: '3.00', recurring: true, }));

          applePay.ready(ensureDone(done, () => {
            assert.deepEqual(applePay.session.recurringPaymentRequest, {
              paymentDescription: applePay.session.total.label,
              regularBilling: applePay.session.total,
              managementURL: infoFixture.managementURL,
              tokenNotificationURL: infoFixture.tokenNotificationURL,
            });
          }));
        });

        describe('when options.recurringPaymentRequest is provided', function () {
          const recurringPaymentRequest = {
            paymentDescription: 'Recurring Test',
            regularBilling: { label: 'Total', amount: '3.00', paymentTiming: 'recurring' },
          };

          it('uses it as the recurringPaymentRequest', function (done) {
            const applePay = this.recurly.ApplePay(merge({}, validOpts, {
              paymentRequest: {
                recurringPaymentRequest: {
                  ...recurringPaymentRequest,
                  managementURL: 'https://example.com',
                },
              },
            }));

            applePay.ready(ensureDone(done, () => {
              assert.deepEqual(applePay.session.recurringPaymentRequest, {
                ...recurringPaymentRequest,
                tokenNotificationURL: infoFixture.tokenNotificationURL,
                managementURL: 'https://example.com',
              });
            }));
          });

          it('uses the managementURL from the server', function (done) {
            const applePay = this.recurly.ApplePay(merge({}, validOpts, { paymentRequest: { recurringPaymentRequest, } }));

            applePay.ready(ensureDone(done,() => {
              assert.deepEqual(applePay.session.recurringPaymentRequest, {
                ...recurringPaymentRequest,
                tokenNotificationURL: infoFixture.tokenNotificationURL,
                managementURL: infoFixture.managementURL,
              });
            }));
          });
        });
      });

      it('sets other ApplePayPaymentRequest options and does not include configuration options', function (done) {
        const applePay = this.recurly.ApplePay(merge({}, validOpts, {
          paymentRequest: {
            requiredShippingContactFields: ['email'],
            supportedCountries: ['US'],
          },
        }));

        applePay.ready(ensureDone(done, () => {
          assert.deepEqual(applePay.session.requiredShippingContactFields, ['email']);
          assert.deepEqual(applePay.session.supportedCountries, ['US']);
          assert.equal(applePay.session.currencyCode, validOpts.currency);
          assert.equal(applePay.session.countryCode, validOpts.country);
          assert.equal(applePay.session.form, undefined);
        }));
      });

      describe('requiredBillingContactFields', function () {
        it('defaults to the postalAddress', function (done) {
          const applePay = this.recurly.ApplePay(validOpts);
          applePay.ready(ensureDone(done, () => {
            assert.deepEqual(applePay.session.requiredBillingContactFields, ['postalAddress']);
          }));
        });

        it('includes the configuration billing fields', function (done) {
          const applePay = this.recurly.ApplePay(merge({} , validOpts, {
            paymentRequest: {
              requiredBillingContactFields: ['name', 'postalAddress'],
            },
          }));

          applePay.ready(ensureDone(done, () => {
            assert.deepEqual(applePay.session.requiredBillingContactFields, ['name', 'postalAddress']);
          }));
        });
      });

      describe('merchant info collection', function () {
        beforeEach(function () {
          this.applePay = this.recurly.ApplePay(validOpts);
        });

        it('assigns the applicationData', function (done) {
          this.applePay.ready(ensureDone(done, () => {
            assert.equal(this.applePay.session.applicationData, btoa('test'));
          }));
        });

        it('assigns merchantCapabilities', function (done) {
          this.applePay.ready(ensureDone(done, () => {
            assert.deepEqual(this.applePay.session.merchantCapabilities, infoFixture.merchantCapabilities);
          }));
        });

        it('assigns supportedNetworks', function (done) {
          this.applePay.ready(ensureDone(done, () => {
            assert.deepEqual(this.applePay.session.supportedNetworks, infoFixture.supportedNetworks);
          }));
        });

        it('limits the supportedNetworks to the configuration', function (done) {
          const applePay = this.recurly.ApplePay(merge({}, validOpts, {
            paymentRequest: { supportedNetworks: ['visa'], },
          }));
          applePay.ready(ensureDone(done, () => {
            assert.deepEqual(applePay.session.supportedNetworks, ['visa']);
          }));
        });
      });

      describe('billingContact', function () {
        const billingContact = {
          givenName: 'Emmet',
          familyName: 'Brown',
          addressLines: ['1640 Riverside Drive', 'Suite 1'],
          locality: 'Hill Valley',
          administrativeArea: 'CA',
          postalCode: '91103',
          countryCode: 'US'
        };

        const billingAddress = {
          first_name: billingContact.givenName,
          last_name: billingContact.familyName,
          address1: billingContact.addressLines[0],
          address2: billingContact.addressLines[1],
          city: billingContact.locality,
          state: billingContact.administrativeArea,
          postal_code: billingContact.postalCode,
          country: billingContact.countryCode,
        };

        it('populates with the form address fields when available', function (done) {
          const applePay = this.recurly.ApplePay(merge({}, validOpts, { form: billingAddress }));
          applePay.ready(ensureDone(done, () => {
            assert.deepEqual(applePay.session.billingContact, billingContact);
            assert.equal(applePay.session.shippingContact, undefined);
          }));
        });

        it('populates with the pricing address when available', function (done) {
          const pricing = this.recurly.Pricing.Checkout();
          const applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing }));
          pricing.address(billingAddress).done(() => {
            applePay.ready(ensureDone(done, () => {
              assert.deepEqual(applePay.session.billingContact, billingContact);
              assert.equal(applePay.session.shippingContact, undefined);
            }));
          });
        });

        it('prefers the override if the form/pricing is populated', function (done) {
          const form = {
            first_name: 'Bobby',
            last_name: 'Brown',
            city: 'Mill Valley',
          };
          const pricing = this.recurly.Pricing.Checkout();
          pricing.address(form).done(() => {
            const applePay = this.recurly.ApplePay(merge({}, validOpts, { form, pricing, paymentRequest: { billingContact } }));
            applePay.ready(ensureDone(done, () => {
              assert.deepEqual(applePay.session.billingContact, billingContact);
              assert.equal(applePay.session.shippingContact, undefined);
            }));
          });
        });

        it('omits if there is no form or override', function (done) {
          const applePay = this.recurly.ApplePay(validOpts);
          applePay.ready(ensureDone(done, () => {
            assert.equal(applePay.session.billingContact, undefined);
          }));
        });
      });

      describe('shippingContact', function () {
        const shippingContact = { phoneNumber: '5555555555', };
        const shippingAddress = { phone: '5555555555', };

        it('populates with the form address fields when available', function (done) {
          const applePay = this.recurly.ApplePay(merge({}, validOpts, { form: shippingAddress }));
          applePay.ready(ensureDone(done, () => {
            assert.deepEqual(applePay.session.shippingContact, shippingContact);
            assert.equal(applePay.session.billingContact, undefined);
          }));
        });

        it('populates with the pricing shipping address when available', function (done) {
          const pricing = this.recurly.Pricing.Checkout();
          pricing.shippingAddress(shippingAddress).done(() => {
            const applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing }));
            applePay.ready(ensureDone(done, () => {
              assert.deepEqual(applePay.session.shippingContact, shippingContact);
              assert.equal(applePay.session.billingContact, undefined);
            }));
          });
        });

        it('populates the shipping address with the address phone number', function (done) {
          const phone = '3333333333';
          const pricing = this.recurly.Pricing.Checkout();
          pricing.address({ phone }).done(() => {
            const applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing }));
            applePay.ready(ensureDone(done, () => {
              assert.deepEqual(applePay.session.shippingContact, { phoneNumber: phone, });
            }));
          });
        });

        describe('with pricing that has both a shipping address and phone number from the address', function () {
          const phone = '3333333333';
          const fullShippingAddress = {
            first_name: 'Bobby',
            last_name: 'Brown',
            city: 'Mill Valley',
          };

          it('populates with the pricing address phone number when available', function (done) {
            const pricing = this.recurly.Pricing.Checkout();
            pricing.address({ phone }).shippingAddress(fullShippingAddress).done(() => {
              const applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing }));
              applePay.ready(ensureDone(done, () => {
                assert.equal(applePay.session.billingContact, undefined);
                assert.deepEqual(applePay.session.shippingContact, {
                  phoneNumber: phone,
                  givenName: 'Bobby',
                  familyName: 'Brown',
                  locality: 'Mill Valley',
                });
              }));
            });
          });

          it('uses the shippingAddress phone number over the address', function (done) {
            const pricing = this.recurly.Pricing.Checkout();
            pricing.address({ phone }).shippingAddress({ ...fullShippingAddress, ...shippingAddress })
              .done(() => {
                const applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing }));
                applePay.ready(ensureDone(done, () => {
                  assert.deepEqual(applePay.session.shippingContact, {
                    givenName: 'Bobby',
                    familyName: 'Brown',
                    locality: 'Mill Valley',
                    ...shippingContact,
                  });
                }));
              });
          });
        });

        it('prefers the override if the form/pricing is populated', function (done) {
          const form = {
            phone: '3333333333',
          };

          const pricing = this.recurly.Pricing.Checkout();
          pricing.shippingAddress(form).done(() => {
            const applePay = this.recurly.ApplePay(merge({}, validOpts, { form, pricing, paymentRequest: { shippingContact } }));
            applePay.ready(ensureDone(done, () => {
              assert.deepEqual(applePay.session.shippingContact, shippingContact);
            }));
          });
        });

        it('omits if there is no form or override', function (done) {
          const applePay = this.recurly.ApplePay(validOpts);
          applePay.ready(ensureDone(done, () => {
            assert.equal(applePay.session.shippingContact, undefined);
          }));
        });
      });

      it('emits ready when done', function (done) {
        this.recurly.ApplePay(validOpts).on('ready', done);
      });

      if (isBraintreeIntegration) {
        describe('when the libs are not loaded', function () {
          beforeEach(function () {
            delete window.braintree;
            this.sandbox.stub(BraintreeLoader, 'loadModules').rejects('boom');
          });

          it('load the libs', function (done) {
            const applePay = this.recurly.ApplePay(validOpts);
            applePay.on('error', ensureDone(done, (err) => {
              assert(BraintreeLoader.loadModules.calledWith('applePay', 'dataCollector'));
              assert.equal(err, applePay.initError);
              assertInitError(applePay, 'apple-pay-init-error');
            }));
          });
        });

        it('assigns the braintree configuration', function (done) {
          const applePay = this.recurly.ApplePay(validOpts);

          applePay.on('ready', () => {
            nextTick(ensureDone(done, () => {
              assert.ok(applePay.braintree.dataCollector);
              assert.ok(applePay.braintree.applePay);
            }));
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
        applePay.on('ready', ensureDone(done, () => {
          applePay.begin();
          assert(applePay.session instanceof ApplePaySessionStub);
        }));
      });

      it('establishes a session and initiates it without options.form', function (done) {
        let applePay = this.recurly.ApplePay(omit(validOpts, 'form'));
        applePay.on('ready', ensureDone(done, () => {
          applePay.begin();
          assert(applePay.session instanceof ApplePaySessionStub);
        }));
      });
    });

    describe('onPricingChange', function () {
      beforeEach(function () {
        this.pricing = this.recurly.Pricing();
      });

      it('updates the total to reflect Pricing changes', function (done) {
        let applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing: this.pricing }));
        applePay.on('ready', () => {
          let originalTotal = clone(applePay.totalLineItem);
          this.pricing.on('change', ensureDone(done, () => {
            assert.notDeepEqual(originalTotal, applePay.totalLineItem);
          }));
          this.pricing.plan('basic', { quantity: 1 }).done();
        });
      });
    });

    describe('internal event handlers', function () {
      beforeEach(function (done) {
        this.applePay = this.recurly.ApplePay(validOpts);
        this.applePay.ready(done);
      });

      describe('onValidateMerchant', function () {
        if (isDirectIntegration) {
          it('calls the merchant validation endpoint and passes the result to the ApplePaySession', function (done) {
            const expectedMerchantSessionIdentifier = 'C8135543D34E42CCB22BCABD64E6A2E7_916523AAED1343F5BC5815E12BEE9250AFFDC1A17C46B0DE5A943F0F94927C24';

            this.applePay.session.on('completeMerchantValidation', ensureDone(done, () => {
              assert.equal(typeof this.applePay.session.merchantSession, 'object');
              assert.equal(
                this.applePay.session.merchantSession.merchantSessionIdentifier,
                expectedMerchantSessionIdentifier
              );
            }));

            this.applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });
          });
        }

        if (isBraintreeIntegration) {
          beforeEach(function () {
            this.spyStartRequest = this.sandbox.spy(this.recurly.request, 'post');
          });

          it('do not call the merchant validation start endpoint', function (done) {
            this.applePay.session.on('completeMerchantValidation', ensureDone(done, () => {
              assert.equal(this.spyStartRequest.called, false);
            }));
            this.applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });
          });

          it('calls the braintree performValidation with the validation url', function (done) {
            const applePay = this.recurly.ApplePay(merge({}, validOpts, {
              braintree: {
                displayName: 'My Great Store',
              }
            }));
            applePay.ready(ensureDone(done, () => {
              applePay.session.on('completeMerchantValidation', ensureDone(done, () => {
                assert.ok(applePay.braintree.applePay.performValidation.calledWith({
                  validationURL: 'valid-test-url',
                  displayName: 'My Great Store'
                }));
              }));
              applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });
            }));
          });

          it('calls the completeMerchantValidation with the merchant session', function (done) {
            const completeMerchantValidationSpy = this.sandbox.spy(this.applePay.session, 'completeMerchantValidation');
            this.applePay.session.on('completeMerchantValidation', ensureDone(done, () => {
              assert.ok(completeMerchantValidationSpy.calledWith('MERCHANT_SESSION'));
            }));
            this.applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });
          });

          it('emits an error if the braintree performValidation fails', function (done) {
            this.applePay.braintree.applePay.performValidation = this.sandbox.stub().rejects('error');
            const completeMerchantValidationSpy = this.sandbox.spy(this.applePay.session, 'completeMerchantValidation');

            this.applePay.session.onvalidatemerchant({ validationURL: 'valid-test-url' });

            this.applePay.on('error', ensureDone(done, (err) => {
              assert.equal(completeMerchantValidationSpy.called, false);
              assert.equal(err, 'error');
            }));
          });
        }
      });

      describe('onPaymentMethodSelected', function () {
        it('calls ApplePaySession.completePaymentSelection with a total and line items', function (done) {
          this.applePay.session.on('completePaymentMethodSelection', ensureDone(done, (update) => {
            assert.deepEqual(update.newTotal, this.applePay.finalTotalLineItem);
            assert.deepEqual(update.newLineItems, this.applePay.lineItems);
            assert.equal(update.newRecurringPaymentRequest, undefined);
          }));
          this.applePay.session.onpaymentmethodselected({ paymentMethod: { billingContact: { postalCode: '94114' } } });
        });

        it('emits paymentMethodSelected', function (done) {
          const example = { paymentMethod: {} };
          this.applePay.on('paymentMethodSelected', ensureDone(done, (event) => {
            assert.deepEqual(event, example);
          }));
          this.applePay.session.onpaymentmethodselected(example);
        });

        it('accepts a promise callback to modify the update response', function (done) {
          const newLineItems = [{ label: 'Tax', amount: '1.00' }];
          this.applePay.config.callbacks = { onPaymentMethodSelected: () => Promise.resolve({ newLineItems }) };

          this.applePay.session.on('completePaymentMethodSelection', ensureDone(done, (update) => {
            assert.deepEqual(update.newTotal, this.applePay.finalTotalLineItem);
            assert.deepEqual(update.newLineItems, newLineItems);
            assert.deepEqual(undefined, this.applePay._paymentRequest.lineItems);
          }));
          this.applePay.session.onpaymentmethodselected({ paymentMethod: {} });
        });

        it('accepts the total and sets the newTotal', function (done) {
          this.applePay.config.callbacks = { onPaymentMethodSelected: () => Promise.resolve({ total: '100' }) };

          this.applePay.session.on('completePaymentMethodSelection', ensureDone(done, (update) => {
            assert.deepEqual(update.newTotal, this.applePay.totalLineItem);
            assert.equal(this.applePay.finalTotalLineItem.amount, '100');
          }));
          this.applePay.session.onpaymentmethodselected({ paymentMethod: {} });
        });

        describe('with options.recurringPaymentRequest set', function () {
          beforeEach(function (done) {
            this.applePay = this.recurly.ApplePay(merge({}, validOpts, { recurring: true }));
            this.applePay.ready(done);
          });

          it('includes the newRecurringPaymentRequest', function (done) {
            this.applePay.session.on('completePaymentMethodSelection', ensureDone(done, (update) => {
              assert.notEqual(update.newRecurringPaymentRequest, undefined);
              assert.deepEqual(update.newRecurringPaymentRequest, this.applePay.recurringPaymentRequest);
            }));
            this.applePay.session.onpaymentmethodselected({ paymentMethod: { billingContact: { postalCode: '94114' } } });
          });

          it('sets the required fields on the newRecurringPaymentRequest if not passed in on the callback', function (done) {
            this.applePay.config.callbacks = {
              onPaymentMethodSelected: () => Promise.resolve({
                newRecurringPaymentRequest: {
                  regularBilling: this.applePay.totalLineItem,
                },
              }),
            };
            this.applePay.session.on('completePaymentMethodSelection', ensureDone(done, (update) => {
              assert.equal(update.newRecurringPaymentRequest.managementURL, this.applePay.recurringPaymentRequest.managementURL);
              assert.equal(update.newRecurringPaymentRequest.paymentDescription, this.applePay.recurringPaymentRequest.paymentDescription);
            }));
            this.applePay.session.onpaymentmethodselected({ paymentMethod: { billingContact: { postalCode: '94114' } } });
          });

          it('sets the required newRecurringPaymentRequest if not passed in on the callback and total is updated', function (done) {
            this.applePay.config.callbacks = {
              onPaymentMethodSelected: () => Promise.resolve({
                newTotal: { ...this.applePay.totalLineItem, amount: '100', }
              }),
            };
            this.applePay.session.on('completePaymentMethodSelection', ensureDone(done, (update) => {
              assert.equal(update.newRecurringPaymentRequest.managementURL, this.applePay.recurringPaymentRequest.managementURL);
              assert.equal(update.newRecurringPaymentRequest.paymentDescription, this.applePay.recurringPaymentRequest.paymentDescription);
              assert.equal(update.newRecurringPaymentRequest.regularBilling.amount, '100');
            }));
            this.applePay.session.onpaymentmethodselected({ paymentMethod: { billingContact: { postalCode: '94114' } } });
          });

          it('sets the newRecurringPaymentRequest amount from the total', function (done) {
            this.applePay.config.callbacks = { onPaymentMethodSelected: () => Promise.resolve({ total: '100' }) };

            this.applePay.session.on('completePaymentMethodSelection', ensureDone(done, (update) => {
              assert.deepEqual(update.newTotal, this.applePay.totalLineItem);
              assert.equal(this.applePay.finalTotalLineItem.amount, '100');
              assert.equal(this.applePay.recurringPaymentRequest.regularBilling.amount, '100');
            }));
            this.applePay.session.onpaymentmethodselected({ paymentMethod: {} });
          });
        });

        describe('with options.pricing set', function () {
          beforeEach(function (done) {
            this.pricing = this.recurly.Pricing.Checkout();
            this.applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing: this.pricing }));
            this.pricing.adjustment({ amount: 10 }).done(() => {
              this.applePay.ready(done);
            });
          });

          it('reprices when the billingContact is selected', function (done) {
            const spy = this.sandbox.spy(this.pricing, 'reprice');
            this.applePay.session.on('completePaymentMethodSelection', ensureDone(done, (update) => {
              assert.deepEqual(this.pricing.items.address, { postal_code: '94110', country: 'US' });
              assert.deepEqual(update.newTotal, this.applePay.finalTotalLineItem);
              assert.deepEqual(update.newLineItems, this.applePay.lineItems);
              assert.equal(update.newLineItems[1].label, 'Tax');
              assert.equal(update.newLineItems[1].amount, this.pricing.price.now.taxes);
              assert(spy.called, 'should have repriced');
            }));

            this.applePay.session.onpaymentmethodselected({
              paymentMethod: { billingContact: { postalCode: '94110', countryCode: 'US' } }
            });
          });
        });
      });

      describe('onShippingContactSelected', function () {
        it('calls ApplePaySession.completeShippingContactSelection with empty methods, a total, and line items', function (done) {
          this.applePay.session.on('completeShippingContactSelection', ensureDone(done, (update) => {
            assert.deepEqual(update.newTotal, this.applePay.finalTotalLineItem);
            assert.deepEqual(update.newLineItems, this.applePay.lineItems);
            assert.equal(update.newRecurringPaymentRequest, undefined);
          }));
          this.applePay.session.onshippingcontactselected({});
        });

        it('emits shippingContactSelected', function (done) {
          const example = { shippingContact: { postalCode: '94114' } };
          this.applePay.on('shippingContactSelected', ensureDone(done, (event) => {
            assert.deepEqual(event, example);
          }));
          this.applePay.session.onshippingcontactselected(example);
        });

        it('accepts a callback to modify the update response', function (done) {
          const newLineItems = [{ label: 'Shipping', amount: '1.00' }];
          this.applePay.config.callbacks = { onShippingContactSelected: () => ({ newLineItems }) };

          this.applePay.session.on('completeShippingContactSelection', ensureDone(done, (update) => {
            assert.deepEqual(update.newTotal, this.applePay.finalTotalLineItem);
            assert.deepEqual(update.newLineItems, newLineItems);
            assert.deepEqual(undefined, this.applePay._paymentRequest.lineItems);
          }));
          this.applePay.session.onshippingcontactselected({});
        });

        describe('with options.recurringPaymentRequest set', function () {
          beforeEach(function (done) {
            this.applePay = this.recurly.ApplePay(merge({}, validOpts, { recurring: true }));
            this.applePay.ready(ensureDone(done, () => {
              this.applePay.begin();
            }));
          });

          it('includes the newRecurringPaymentRequest', function (done) {
            this.applePay.session.on('completeShippingContactSelection', ensureDone(done, (update) => {
              assert.notEqual(update.newRecurringPaymentRequest, undefined);
              assert.deepEqual(update.newRecurringPaymentRequest, this.applePay.recurringPaymentRequest);
            }));
            this.applePay.session.onshippingcontactselected({});
          });
        });

        describe('with options.pricing set', function () {
          beforeEach(function (done) {
            this.pricing = this.recurly.Pricing.Checkout();
            this.applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing: this.pricing }));
            this.pricing.adjustment({ amount: 10 }).done(() => {
              this.applePay.ready(done);
            });
          });

          it('reprices when the shippingContact is selected', function (done) {
            const spy = this.sandbox.spy(this.pricing, 'reprice');

            this.applePay.session.on('completeShippingContactSelection', ensureDone(done, (update) => {
              assert.deepEqual(this.pricing.items.shippingAddress, { postal_code: '94110', country: 'US' });
              assert.deepEqual(update.newTotal, this.applePay.finalTotalLineItem);
              assert.deepEqual(update.newLineItems, this.applePay.lineItems);
              assert.equal(update.newLineItems[1].label, 'Tax');
              assert.equal(update.newLineItems[1].amount, this.pricing.price.now.taxes);
              assert(spy.called, 'should have repriced');
            }));

            this.applePay.session.onshippingcontactselected({
              shippingContact: { postalCode: '94110', countryCode: 'US' }
            });
          });
        });
      });

      describe('onShippingMethodSelected', function () {
        it('calls ApplePaySession.completeShippingMethodSelection with a total, and line items', function (done) {
          this.applePay.session.on('completeShippingMethodSelection', ensureDone(done, (update) => {
            assert.deepEqual(update.newTotal, this.applePay.finalTotalLineItem);
            assert.deepEqual(update.newLineItems, this.applePay.lineItems);
            assert.equal(update.newRecurringPaymentRequest, undefined);
          }));
          this.applePay.session.onshippingmethodselected();
        });

        it('emits shippingMethodSelected', function (done) {
          const example = { test: 'event' };
          this.applePay.on('shippingMethodSelected', ensureDone(done, (event) => {
            assert.deepEqual(event, example);
          }));
          this.applePay.session.onshippingmethodselected(example);
        });

        it('accepts a callback to modify the update response', function (done) {
          const newLineItems = [{ label: 'Shipping', amount: '1.00' }];
          this.applePay.config.callbacks = { onShippingMethodSelected: () => ({ newLineItems }) };

          this.applePay.session.on('completeShippingMethodSelection', ensureDone(done, (update) => {
            assert.deepEqual(update.newTotal, this.applePay.finalTotalLineItem);
            assert.deepEqual(update.newLineItems, newLineItems);
            assert.deepEqual(undefined, this.applePay._paymentRequest.lineItems);
          }));
          this.applePay.session.onshippingmethodselected();
        });

        describe('with options.recurringPaymentRequest set', function () {
          beforeEach(function (done) {
            this.applePay = this.recurly.ApplePay(merge({}, validOpts, { recurring: true }));
            this.applePay.ready(ensureDone(done, () => {
              this.applePay.begin();
            }));
          });

          it('includes the newRecurringPaymentRequest', function (done) {
            this.applePay.session.on('completeShippingMethodSelection', ensureDone(done, (update) => {
              assert.notEqual(update.newRecurringPaymentRequest, undefined);
              assert.deepEqual(update.newRecurringPaymentRequest, this.applePay.recurringPaymentRequest);
            }));
            this.applePay.session.onshippingmethodselected({});
          });
        });
      });

      describe('onCouponCodeChanged', function () {
        it('calls ApplePaySession.completeCouponCodeChange with a total, and line items', function (done) {
          this.applePay.session.on('completeCouponCodeChange', ensureDone(done, (update) => {
            assert.deepEqual(update.newTotal, this.applePay.finalTotalLineItem);
            assert.deepEqual(update.newLineItems, this.applePay.lineItems);
            assert.equal(update.newRecurringPaymentRequest, undefined);
          }));
          this.applePay.session.oncouponcodechanged();
        });

        it('emits couponcodechanged', function (done) {
          const example = { test: 'event' };
          this.applePay.on('couponCodeChanged', ensureDone(done, (event) => {
            assert.deepEqual(event, example);
          }));
          this.applePay.session.oncouponcodechanged(example);
        });

        it('accepts a callback to modify the update response', function (done) {
          const newLineItems = [{ label: 'Shipping', amount: '1.00' }];
          this.applePay.config.callbacks = { onCouponCodeChanged: () => ({ newLineItems }) };

          this.applePay.session.on('completeCouponCodeChange', ensureDone(done, (update) => {
            assert.deepEqual(update.newTotal, this.applePay.finalTotalLineItem);
            assert.deepEqual(update.newLineItems, newLineItems);
            assert.deepEqual(undefined, this.applePay._paymentRequest.lineItems);
          }));
          this.applePay.session.oncouponcodechanged();
        });

        describe('with options.recurringPaymentRequest set', function () {
          beforeEach(function (done) {
            this.applePay = this.recurly.ApplePay(merge({}, validOpts, { recurring: true }));
            this.applePay.ready(ensureDone(done, () => {
              this.applePay.begin();
            }));
          });

          it('includes the newRecurringPaymentRequest', function (done) {
            this.applePay.session.on('completeCouponCodeChange', ensureDone(done, (update) => {
              assert.notEqual(update.newRecurringPaymentRequest, undefined);
              assert.deepEqual(update.newRecurringPaymentRequest, this.applePay.recurringPaymentRequest);
            }));
            this.applePay.session.oncouponcodechanged({});
          });
        });
      });

      describe('onPaymentAuthorized', function () {
        const billingContact = {
          givenName: 'Emmet',
          familyName: 'Brown',
          addressLines: ['1640 Riverside Drive', 'Suite 1'],
          locality: 'Hill Valley',
          administrativeArea: 'CA',
          postalCode: '91103',
          countryCode: 'US',
        };

        const billingAddress = {
          first_name: billingContact.givenName,
          last_name: billingContact.familyName,
          address1: billingContact.addressLines[0],
          address2: billingContact.addressLines[1],
          city: billingContact.locality,
          state: billingContact.administrativeArea,
          postal_code: billingContact.postalCode,
          country: billingContact.countryCode,
        };

        const inputNotAddressFields = {
          tax_identifier: 'tax123',
          tax_identifier_type: 'cpf',
        };

        const validAuthorizeEvent = {
          payment: {
            billingContact: billingContact,
            token: {
              paymentData: 'valid-payment-data',
              paymentMethod: 'valid-payment-method',
            }
          }
        };

        it('completes payment', function (done) {
          this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
          this.applePay.session.on('completePayment', ensureDone(done, (update) => {
            assert.equal(update.status, this.applePay.session.STATUS_SUCCESS);
          }));
        });

        it('emits a token event', function (done) {
          const expectedTokenId = 'atnbRPPuXvNAa_mqxD-Ptg';

          this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
          this.applePay.on('token', ensureDone(done, (token, event) => {
            assert.deepEqual(token, {
              id: expectedTokenId
            });

            if (isBraintreeIntegration) {
              assert.deepEqual(event, {
                payment: {
                  gatewayToken: 'TOKENIZED_PAYLOAD',
                  recurlyToken: token,
                  ...validAuthorizeEvent.payment,
                },
              });
            } else {
              assert.deepEqual(event, {
                payment: {
                  recurlyToken: token,
                  ...validAuthorizeEvent.payment,
                },
              });
            }
          }));
        });

        it('emits paymentAuthorized', function (done) {
          const example = clone(validAuthorizeEvent);
          this.applePay.on('paymentAuthorized', ensureDone(done, (event) => {
            assert.deepEqual(event, example);
          }));
          this.applePay.session.onpaymentauthorized(example);
        });

        it('accepts a promise to reject errors', function (done) {
          const errors = [{ code: 'shippingAddressInvalid', contactField: 'emailAddress', message: 'not gmail!' }];
          this.applePay.config.callbacks = { onPaymentAuthorized: () => Promise.reject(errors) };

          this.applePay.session.on('completePayment', ensureDone(done, (update) => {
            assert.deepEqual(update.errors, errors);
            assert.deepEqual(update.status, this.applePay.session.STATUS_FAILURE);
          }));
          this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
        });

        it('accepts a callback to return errors', function (done) {
          const errors = [{ code: 'shippingAddressInvalid', contactField: 'emailAddress', message: 'not gmail!' }];
          this.applePay.config.callbacks = { onPaymentAuthorized: () => ({ errors }) };

          this.applePay.session.on('completePayment', ensureDone(done, (update) => {
            assert.deepEqual(update.errors, errors);
            assert.deepEqual(update.status, this.applePay.session.STATUS_FAILURE);
          }));
          this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
        });

        it('accepts a callback to return success', function (done) {
          this.applePay.config.callbacks = { onPaymentAuthorized: () => {} };
          this.applePay.session.on('completePayment', ensureDone(done, (update) => {
            assert.deepEqual(update.status, this.applePay.session.STATUS_SUCCESS);
          }));
          this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
        });

        if (isDirectIntegration) {
          it('pass the expected parameters to create the token', function (done) {
            this.spyTokenRequest = this.sandbox.spy(this.recurly.request, 'post');

            this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
            this.applePay.on('token', ensureDone(done, () => {
              const args = this.spyTokenRequest.getCall(0).args[0];
              assert.deepEqual(args.data, {
                paymentData: 'valid-payment-data',
                paymentMethod: 'valid-payment-method',
                ...billingAddress,
              });
            }));
          });

          it('passes the non address parameters to create the token', function (done) {
            this.spyTokenRequest = this.sandbox.spy(this.recurly.request, 'post');
            this.applePay.config.form = clone(inputNotAddressFields);
            this.applePay.begin(); // the form has changed!

            this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
            this.applePay.on('token', ensureDone(done, () => {
              const args = this.spyTokenRequest.getCall(0).args[0];
              assert.deepEqual(args.data, {
                paymentData: 'valid-payment-data',
                paymentMethod: 'valid-payment-method',
                ...inputNotAddressFields,
                ...billingAddress,
              });
            }));
          });
        }

        if (isBraintreeIntegration) {
          it('pass the expected parameters to create the token', function (done) {
            this.spyTokenRequest = this.sandbox.spy(this.recurly.request, 'post');

            this.applePay.session.onpaymentauthorized(clone(validAuthorizeEvent));
            this.applePay.on('token', ensureDone(done, () => {
              const args = this.spyTokenRequest.getCall(0).args[0];
              assert.deepEqual(args.data, {
                type: 'braintree',
                payload: {
                  deviceData: 'DEVICE_DATA',
                  tokenizePayload: 'TOKENIZED_PAYLOAD',
                  applePayPayment: {
                    paymentData: 'valid-payment-data',
                    paymentMethod: 'valid-payment-method',
                    ...billingAddress,
                  },
                }
              });
            }));
          });
        }

        describe('when payment data is invalid', function () {
          const invalidAuthorizeEvent = {
            payment: {
              token: {
                paymentData: 'invalid-payment-data'
              }
            }
          };

          it('completes payment with a failure code', function (done) {
            this.applePay.session.onpaymentauthorized(clone(invalidAuthorizeEvent));
            this.applePay.session.on('completePayment', ensureDone(done, (update) => {
              assert.equal(update.status, this.applePay.session.STATUS_FAILURE);
            }));
          });

          it('emits an error event', function (done) {
            const expectedErrorCode = 'invalid-payment-data';
            const expectedErrorMessage = 'invalid payment data';

            this.applePay.session.onpaymentauthorized(clone(invalidAuthorizeEvent));
            this.applePay.on('error', ensureDone(done, err => {
              assert.equal(err.code, expectedErrorCode);
              assert.equal(err.message, expectedErrorMessage);
            }));
          });
        });
      });

      describe('onCancel', function () {
        it('emits onCancel', function (done) {
          const example = { test: 'event' };
          this.applePay.on('cancel', ensureDone(done, (event) => {
            assert.deepEqual(event, example);
          }));
          this.applePay.session.oncancel(example);
        });

        ['address', 'shippingAddress'].forEach(function (addressType) {
          describe(`with options.pricing set and ${addressType} configured`, function () {
            beforeEach(function (done) {
              this.pricing = this.recurly.Pricing.Checkout();
              this.applePay = this.recurly.ApplePay(merge({}, validOpts, { pricing: this.pricing }));
              this.pricing[addressType]({ postalCode: '91411', countryCode: 'US' }).done(() => {
                this.applePay.ready(ensureDone(done,() => {
                  this.applePay.begin();
                }));
              });
            });

            it(`does not reprice if the ${addressType} has not changed`, function (done) {
              const spy = this.sandbox.spy(this.pricing, 'reprice');

              this.applePay.on('cancel', ensureDone(done, () => {
                assert.equal(this.pricing.items[addressType].postalCode, '91411');
                assert.equal(this.pricing.items[addressType].countryCode, 'US');
                assert(!spy.called, 'should not have repriced');
              }));
              this.applePay.session.oncancel({});
            });

            it(`restores the pricing ${addressType} and repricings`, function (done) {
              const spy = this.sandbox.spy(this.pricing, 'reprice');
              this.applePay.on('cancel', ensureDone(done, () => {
                assert.equal(this.pricing.items[addressType].postalCode, '91411');
                assert.equal(this.pricing.items[addressType].countryCode, 'US');
                assert(spy.called, 'should have repriced');
              }));

              this.pricing[addressType]({ postalCode: '91423', countryCode: 'US' })
                .done(() => this.applePay.session.oncancel({}));
            });
          });
        });
      });
    });
  });
}

function assertInitError (applePay, code, other) {
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

function ensureDone (done, fn) {
  return function (...args) {
    try {
      fn(...args);
      done();
    } catch (err) {
      done(err);
    }
  };
}
