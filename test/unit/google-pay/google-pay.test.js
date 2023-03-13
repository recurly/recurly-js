
import assert from 'assert';

import recurlyError from '../../../lib/recurly/errors';
import { initRecurly, apiTest, nextTick, assertDone, stubPromise, stubGooglePaymentAPI } from '../support/helpers';
import { googlePay } from '../../../lib/recurly/google-pay/google-pay';
import dom from '../../../lib/util/dom';

apiTest(requestMethod => describe('Google Pay', function () {
  const cors = requestMethod === 'cors';

  before(() => {
    stubPromise();
  });

  beforeEach(function () {
    this.sandbox = sinon.createSandbox();

    this.recurly = initRecurly({ cors });
    this.googlePayOpts = {
      environment: undefined,
      googleMerchantId: 'GOOGLE_MERCHANT_ID_123',
      googleBusinessName: 'RECURLY',
      total: '1',
      country: 'US',
      currency: 'USD',
      requireBillingAddress: true,
      gatewayCode: 'CODE_123',
    };

    this.paymentMethods = [
      {
        gatewayCode: 'gateway_123',
        cardNetworks: ['VISA'],
        authMethods: ['PAM_ONLY'],
        paymentGateway: 'PAYMENT_GATEWAY_PARAMETERS',
      },
      {
        cardNetworks: ['MASTERCARD'],
        authMethods: ['PAM_ONLY'],
        direct: 'DIRECT_PARAMETERS',
      }
    ];
    this.stubRequestOpts = {
      info: Promise.resolve({
        siteMode: 'test',
        paymentMethods: this.paymentMethods,
      }),
      token: Promise.resolve({
        id: 'TOKEN_123'
      })
    };

    this.stubGoogleAPIOpts = { dom };

    this.stubRequestAndGoogleApi = () => {
      this.cleanGoogleAPIStub = stubGooglePaymentAPI(this.stubGoogleAPIOpts);
      this.sandbox.stub(this.recurly.request, 'get').resolves(this.stubRequestOpts.info);
      this.sandbox.stub(this.recurly.request, 'post').resolves(this.stubRequestOpts.token);
    };
  });

  afterEach(function () {
    this.sandbox.restore();

    if (this.cleanGoogleAPIStub) {
      this.cleanGoogleAPIStub();
    }
  });

  it('requests to Recurly the merchant Google Pay info with the initial options provided', function (done) {
    this.stubRequestAndGoogleApi();
    googlePay(this.recurly, this.googlePayOpts);

    nextTick(() => assertDone(done, () => {
      assert.equal(this.recurly.request.get.called, true);
      assert.deepEqual(this.recurly.request.get.getCall(0).args[0], {
        route: '/google_pay/info',
        data: {
          country: 'US',
          currency: 'USD',
          gateway_code : 'CODE_123',
        },
      });
    }));
  });

  context('when missing a required option', function () {
    const requiredKeys = ['googleMerchantId', 'total', 'country', 'currency'];
    requiredKeys.forEach(key => {
      describe(`:${key}`, function () {
        beforeEach(function () {
          this.googlePayOpts[key] = undefined;
          this.stubRequestAndGoogleApi();
        });

        it('emits a google-pay-config-missing error', function (done) {
          const result = googlePay(this.recurly, this.googlePayOpts);

          result.on('error', (err) => assertDone(done, () => {
            assert.ok(err);
            assert.equal(err.code, 'google-pay-config-missing');
            assert.equal(err.message, `Missing Google Pay configuration option: '${key}'`);
          }));
        });

        it('do not initiate the pay-with-google nor requests to Recurly the merchant Google Pay info', function (done) {
          googlePay(this.recurly, this.googlePayOpts);

          nextTick(() => assertDone(done, () => {
            assert.equal(this.recurly.request.get.called, false);
            assert.equal(window.google.payments.api.PaymentsClient.called, false);
          }));
        });

        it('do not emit any token nor the on ready event', function (done) {
          const result = googlePay(this.recurly, this.googlePayOpts);

          result.on('ready', () => done(new Error('expected to not emit a ready event')));
          result.on('token', () => done(new Error('expected to not emit a token event')));
          nextTick(done);
        });
      });
    });
  });

  context('when fails requesting to Recurly the merchant Google Pay info', function () {
    beforeEach(function () {
      this.stubRequestOpts.info = Promise.reject(recurlyError('api-error'));
      this.stubRequestAndGoogleApi();
    });

    it('emits an api-error', function (done) {
      const result = googlePay(this.recurly, this.googlePayOpts);

      result.on('error', (err) => assertDone(done, () => {
        assert.ok(err);
        assert.equal(err.code, 'api-error');
        assert.equal(err.message, 'There was an error with your request.');
      }));
    });

    it('do not initiate the pay-with-google', function (done) {
      googlePay(this.recurly, this.googlePayOpts);

      nextTick(() => assertDone(done, () => {
        assert.equal(window.google.payments.api.PaymentsClient.called, false);
      }));
    });

    it('do not emit any token nor the on ready event', function (done) {
      const result = googlePay(this.recurly, this.googlePayOpts);

      result.on('ready', () => done(new Error('expected to not emit a ready event')));
      result.on('token', () => done(new Error('expected to not emit a token event')));
      nextTick(done);
    });
  });

  context('when the requested merchant Google Pay info returns an empty list of payment methods', function () {
    beforeEach(function () {
      this.stubRequestOpts.info = Promise.resolve({
        siteMode: 'test',
        paymentMethods: [],
      });
      this.stubRequestAndGoogleApi();
    });

    it('emits a google-pay-not-configured error', function (done) {
      const result = googlePay(this.recurly, this.googlePayOpts);

      result.on('error', (err) => assertDone(done, () => {
        assert.ok(err);
        assert.equal(err.code, 'google-pay-not-configured');
        assert.equal(err.message, 'There are no Payment Methods enabled to support Google Pay');
      }));
    });

    it('do not initiate the pay-with-google', function (done) {
      googlePay(this.recurly, this.googlePayOpts);

      nextTick(() => assertDone(done, () => {
        assert.equal(window.google.payments.api.PaymentsClient.called, false);
      }));
    });

    it('do not emit any token nor the on ready event', function (done) {
      const result = googlePay(this.recurly, this.googlePayOpts);

      result.on('ready', () => done(new Error('expected to not emit a ready event')));
      result.on('token', () => done(new Error('expected to not emit a token event')));
      nextTick(done);
    });
  });

  context('when the requested merchant Google Pay info returns a valid non-empty list of payment methods', function () {
    it('initiates the pay-with-google with the expected Google Pay Configuration', function (done) {
      this.stubRequestAndGoogleApi();
      googlePay(this.recurly, this.googlePayOpts);

      nextTick(() => assertDone(done, () => {
        assert.equal(window.google.payments.api.PaymentsClient.called, true);
        assert.deepEqual(window.google.payments.api.PaymentsClient.getCall(0).args[0], { environment: 'TEST' });
        assert.deepEqual(window.google.payments.api.PaymentsClient.prototype.isReadyToPay.getCall(0).args[0], {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [
            {
              type: 'CARD',
              parameters: {
                allowedCardNetworks: ['VISA'],
                allowedAuthMethods: ['PAM_ONLY'],
                billingAddressRequired: true,
                billingAddressParameters: {
                  format: 'FULL',
                },
              },
              tokenizationSpecification: {
                type: 'PAYMENT_GATEWAY',
                parameters: 'PAYMENT_GATEWAY_PARAMETERS',
              },
            },
            {
              type: 'CARD',
              parameters: {
                allowedCardNetworks: ['MASTERCARD'],
                allowedAuthMethods: ['PAM_ONLY'],
                billingAddressRequired: true,
                billingAddressParameters: {
                  format: 'FULL',
                },
              },
              tokenizationSpecification: {
                type: 'DIRECT',
                parameters: 'DIRECT_PARAMETERS',
              },
            }
          ],
        });
      }));
    });

    context('when the site mode is production but an environment option is provided', function () {
      beforeEach(function () {
        this.stubRequestOpts.info = Promise.resolve({
          siteMode: 'production',
          paymentMethods: this.paymentMethods,
        });
        this.googlePayOpts.environment = 'TEST';
      });

      it('initiates the pay-with-google in the specified environment', function (done) {
        this.stubRequestAndGoogleApi();
        googlePay(this.recurly, this.googlePayOpts);

        nextTick(() => assertDone(done, () => {
          assert.deepEqual(window.google.payments.api.PaymentsClient.getCall(0).args[0], { environment: 'TEST' });
        }));
      });
    });

    context('when the site mode is production and no environment option is provided', function () {
      beforeEach(function () {
        this.stubRequestOpts.info = Promise.resolve({
          siteMode: 'production',
          paymentMethods: this.paymentMethods,
        });
        this.googlePayOpts.environment = undefined;
      });

      it('initiates the pay-with-google in PRODUCTION mode', function (done) {
        this.stubRequestAndGoogleApi();
        googlePay(this.recurly, this.googlePayOpts);

        nextTick(() => assertDone(done, () => {
          assert.deepEqual(window.google.payments.api.PaymentsClient.getCall(0).args[0], { environment: 'PRODUCTION' });
        }));
      });
    });

    context('when the site mode is any other than production but an environment option is provided', function () {
      beforeEach(function () {
        this.stubRequestOpts.info = Promise.resolve({
          siteMode: 'sandbox',
          paymentMethods: this.paymentMethods,
        });
        this.googlePayOpts.environment = 'PRODUCTION';
      });

      it('initiates the pay-with-google in the specified environment', function (done) {
        this.stubRequestAndGoogleApi();
        googlePay(this.recurly, this.googlePayOpts);

        nextTick(() => assertDone(done, () => {
          assert.deepEqual(window.google.payments.api.PaymentsClient.getCall(0).args[0], { environment: 'PRODUCTION' });
        }));
      });
    });

    context('when the site mode is any other than production and no environment option is provided', function () {
      beforeEach(function () {
        this.stubRequestOpts.info = Promise.resolve({
          siteMode: 'sandbox',
          paymentMethods: this.paymentMethods,
        });
        this.googlePayOpts.environment = undefined;
      });

      it('initiates the pay-with-google in TEST mode', function (done) {
        this.stubRequestAndGoogleApi();
        googlePay(this.recurly, this.googlePayOpts);

        nextTick(() => assertDone(done, () => {
          assert.deepEqual(window.google.payments.api.PaymentsClient.getCall(0).args[0], { environment: 'TEST' });
        }));
      });
    });

    context('when the billing address is not required', function () {
      beforeEach(function () {
        this.googlePayOpts.requireBillingAddress = false;
      });

      it('initiates the pay-with-google without the billing address requirement', function (done) {
        this.stubRequestAndGoogleApi();
        googlePay(this.recurly, this.googlePayOpts);

        nextTick(() => assertDone(done, () => {
          assert.deepEqual(window.google.payments.api.PaymentsClient.prototype.isReadyToPay.getCall(0).args[0], {
            apiVersion: 2,
            apiVersionMinor: 0,
            allowedPaymentMethods: [
              {
                type: 'CARD',
                parameters: {
                  allowedCardNetworks: ['VISA'],
                  allowedAuthMethods: ['PAM_ONLY'],
                },
                tokenizationSpecification: {
                  type: 'PAYMENT_GATEWAY',
                  parameters: 'PAYMENT_GATEWAY_PARAMETERS',
                },
              },
              {
                type: 'CARD',
                parameters: {
                  allowedCardNetworks: ['MASTERCARD'],
                  allowedAuthMethods: ['PAM_ONLY'],
                },
                tokenizationSpecification: {
                  type: 'DIRECT',
                  parameters: 'DIRECT_PARAMETERS',
                },
              }
            ],
          });
        }));
      });
    });

    context('when cannot proceed with the pay-with-google', function () {
      beforeEach(function () {
        this.stubGoogleAPIOpts.isReadyToPay = Promise.resolve({ result: false });
        this.stubRequestAndGoogleApi();
      });

      it('emits the same error the pay-with-google throws', function (done) {
        const result = googlePay(this.recurly, this.googlePayOpts);

        result.on('error', (err) => assertDone(done, () => {
          assert.ok(err);
          assert.equal(err.code, 'google-pay-not-available');
          assert.equal(err.message, 'Google Pay is not available');
        }));
      });

      it('do not emit any token nor the on ready event', function (done) {
        const result = googlePay(this.recurly, this.googlePayOpts);

        result.on('ready', () => done(new Error('expected to not emit a ready event')));
        result.on('token', () => done(new Error('expected to not emit a token event')));
        nextTick(done);
      });
    });

    context('when the pay-with-google success', function () {
      it('emits the ready event with the google-pay button', function (done) {
        this.stubRequestAndGoogleApi();
        const result = googlePay(this.recurly, this.googlePayOpts);

        result.on('ready', button => assertDone(done, () => {
          assert.ok(button);
        }));
      });

      context('when the google-pay button is clicked', function () {
        beforeEach(function () {
          this.clickGooglePayButton = (cb) => {
            this.stubRequestAndGoogleApi();
            const result = googlePay(this.recurly, this.googlePayOpts);

            result.on('ready', button => {
              cb(result);
              nextTick(() => button.click());
            });
          };
        });

        it('requests the user Payment Data', function (done) {
          this.clickGooglePayButton(result => {
            result.on('token', () => assertDone(done, () => {
              assert.equal(window.google.payments.api.PaymentsClient.prototype.loadPaymentData.called, true);
            }));
          });
        });

        context('when fails retrieving the user Payment Data', function () {
          beforeEach(function () {
            this.stubGoogleAPIOpts.loadPaymentData = Promise.reject(recurlyError('google-pay-payment-failure'));
          });

          it('emits the same error that the retrieving process throws', function (done) {
            this.clickGooglePayButton(result => {
              result.on('error', err => {
                assertDone(done, () => {
                  assert.ok(err);
                  assert.equal(err.code, 'google-pay-payment-failure');
                  assert.equal(err.message, 'Google Pay could not get the Payment Data');
                });
              });
            });
          });

          it('do not request any token to Recurly', function (done) {
            this.clickGooglePayButton(result => {
              result.on('token', () => done(new Error('expected to not emit the token')));
              result.on('error', () => assertDone(done, () => {
                assert.equal(this.recurly.request.post.called, false);
              }));
            });
          });
        });

        context('when success retrieving the user Payment Data', function () {
          it('request to Recurly to create the token with the billing address from the user Payment Data', function (done) {
            this.clickGooglePayButton(result => {
              result.on('token', () => assertDone(done, () => {
                assert.equal(this.recurly.request.post.called, true);

                assert.deepEqual(this.recurly.request.post.getCall(0).args[0], {
                  route: '/google_pay/token',
                  data: {
                    first_name: 'John',
                    last_name: 'Smith',
                    country: 'US',
                    state: 'CA',
                    city: 'Mountain View',
                    postal_code: '94043',
                    address1: '1600 Amphitheatre Parkway',
                    address2: '',
                    paymentData: {
                      paymentMethodData: {
                        description: 'Visa •••• 1111',
                        tokenizationData: {
                          type: 'PAYMENT_GATEWAY',
                          token: '{"id": "tok_123"}',
                        },
                        type: 'CARD',
                        info: {
                          cardNetwork: 'VISA',
                          cardDetails: '1111',
                          billingAddress: {
                            address3: '',
                            sortingCode: '',
                            address2: '',
                            countryCode: 'US',
                            address1: '1600 Amphitheatre Parkway',
                            postalCode: '94043',
                            name: 'John Smith',
                            locality: 'Mountain View',
                            administrativeArea: 'CA',
                          },
                        },
                      },
                    },
                    gateway_code: 'gateway_123',
                  }
                });
              }));
            });
          });

          context('when the user provide a <form> with custom billing address', function () {
            beforeEach(function () {
              this.googlePayOpts.form = {
                first_name: 'Frank',
                last_name: 'Isaac',
                country: 'RF',
                state: '',
                city: '',
                postal_code: '123',
                address1: '',
                address2: '',
              };
            });

            it('request to Recurly to create the token with the billing address from the <form>', function (done) {
              this.clickGooglePayButton(result => {
                result.on('token', () => assertDone(done, () => {
                  assert.equal(this.recurly.request.post.called, true);

                  assert.deepEqual(this.recurly.request.post.getCall(0).args[0], {
                    route: '/google_pay/token',
                    data: {
                      first_name: 'Frank',
                      last_name: 'Isaac',
                      country: 'RF',
                      state: '',
                      city: '',
                      postal_code: '123',
                      address1: '',
                      address2: '',
                      paymentData: {
                        paymentMethodData: {
                          description: 'Visa •••• 1111',
                          tokenizationData: {
                            type: 'PAYMENT_GATEWAY',
                            token: '{"id": "tok_123"}',
                          },
                          type: 'CARD',
                          info: {
                            cardNetwork: 'VISA',
                            cardDetails: '1111',
                            billingAddress: {
                              address3: '',
                              sortingCode: '',
                              address2: '',
                              countryCode: 'US',
                              address1: '1600 Amphitheatre Parkway',
                              postalCode: '94043',
                              name: 'John Smith',
                              locality: 'Mountain View',
                              administrativeArea: 'CA',
                            },
                          },
                        },
                      },
                      gateway_code: 'gateway_123',
                    }
                  });
                }));
              });
            });
          });

          context('when Recurly fails creating the token', function () {
            beforeEach(function () {
              this.stubRequestOpts.token = Promise.reject(recurlyError('api-error'));
            });

            it('emits an api-error', function (done) {
              this.clickGooglePayButton(result => {
                result.on('error', err => assertDone(done, () => {
                  assert.ok(err);
                  assert.equal(err.code, 'api-error');
                  assert.equal(err.message, 'There was an error with your request.');
                }));
              });
            });

            it('do not emit any token', function (done) {
              this.clickGooglePayButton(result => {
                result.on('token', () => done(new Error('expected to not emit a token event')));

                nextTick(done);
              });
            });
          });

          context('when Recurly success creating the token', function () {
            it('emits the token', function (done) {
              this.clickGooglePayButton(result => {
                result.on('token', (token) => assertDone(done, () => {
                  assert.ok(token);
                  assert.deepEqual(token, {
                    id: 'TOKEN_123',
                  });
                }));
              });
            });
          });
        });
      });
    });
  });
}));
