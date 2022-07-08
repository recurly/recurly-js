import assert from 'assert';
import Emitter from 'component-emitter';
import dom from '../../../lib/util/dom';
import { nextTick, assertDone, stubPromise, stubGooglePaymentAPI } from '../support/helpers';
import { payWithGoogle } from '../../../lib/recurly/google-pay/pay-with-google';

describe('Pay with Google', function () {
  before(() => {
    stubPromise();
  });

  beforeEach(function () {
    this.payWithGoogleOpts = {
      googlePayInfo: {
        environment: 'TEST',
        googlePayConfig: 'GOOGLE PAY CONFIG',
        paymentDataRequest: 'PAYMENT DATA REQUEST',
      },
      options: {
        buttonOptions: {
          color: 'RED',
        },
      },
    };

    this.stubGoogleAPIOpts = { dom };
    this.stubGoogleApi = () => {
      this.cleanGoogleAPIStub = stubGooglePaymentAPI(this.stubGoogleAPIOpts);
    };
  });

  afterEach(function () {
    if (this.cleanGoogleAPIStub) {
      this.cleanGoogleAPIStub();
    }
  });

  it('loads the Google Pay script https://pay.google.com/gp/p/js/pay.js', function (done) {
    this.stubGoogleApi();

    payWithGoogle(this.payWithGoogleOpts)
      .finally(() => assertDone(done, () => {
        assert.equal(dom.loadLibs.getCall(0).args[0], 'https://pay.google.com/gp/p/js/pay.js');
      }));
  });

  context('when the script was already loaded and settle to window.google.payments.api.PaymentsClient', function () {
    beforeEach(function () {
      window.google = {
        payments: { api: { PaymentsClient: function () {} } }
      };
    });

    afterEach(function () {
      delete window.google;
    });

    it ('do not re-load the script', function (done) {
      this.stubGoogleApi();

      payWithGoogle(this.payWithGoogleOpts)
        .finally(() => assertDone(done, () => {
          assert.equal(dom.loadLibs.called, false);
        }));
    });
  });

  context('when failed loading the Google Pay script', function () {
    beforeEach(function () {
      this.stubGoogleAPIOpts.loadLibs = Promise.reject(new Error('Failed loading the Google Pay Lib'));
    });

    it('rejects with a google-pay-init-error', function (done) {
      this.stubGoogleApi();

      payWithGoogle(this.payWithGoogleOpts)
        .catch(err => assertDone(done, () => {
          assert.ok(err);
          assert.equal(err.code, 'google-pay-init-error');
          assert.equal(err.message, 'Google Pay did not initialize due to a fatal error: Failed loading the Google Pay Lib');
        }));
    });
  });

  context('when success loading the Google Pay script', function () {
    it('initializes the Google PaymentClient with the environment provided', function (done) {
      this.stubGoogleApi();

      payWithGoogle(this.payWithGoogleOpts)
        .finally(() => assertDone(done, () => {
          assert.deepEqual(window.google.payments.api.PaymentsClient.getCall(0).args[0], { environment: 'TEST' });
        }));
    });

    it('checks the Google Pay availability with the Google Pay Configuration provided', function (done) {
      this.stubGoogleApi();

      payWithGoogle(this.payWithGoogleOpts)
        .finally(() => assertDone(done, () => {
          assert.equal(window.google.payments.api.PaymentsClient.prototype.isReadyToPay.getCall(0).args[0], 'GOOGLE PAY CONFIG');
        }));
    });

    context('when fails checking the Google Pay availability', function () {
      beforeEach(function () {
        this.stubGoogleAPIOpts.isReadyToPay = Promise.reject(new Error('Failed to check Google Pay availability'));
      });

      it('rejects with a google-pay-init-error', function (done) {
        this.stubGoogleApi();

        payWithGoogle(this.payWithGoogleOpts)
          .catch(err => assertDone(done, () => {
            assert.ok(err);
            assert.equal(err.code, 'google-pay-init-error');
            assert.equal(err.message, 'Google Pay did not initialize due to a fatal error: Failed to check Google Pay availability');
          }));
      });
    });

    context('when there are no availability to pay with Google', function () {
      beforeEach(function () {
        this.stubGoogleAPIOpts.isReadyToPay = Promise.resolve({ response: false });
      });

      it('rejects with a google-pay-not-available error', function (done) {
        this.stubGoogleApi();

        payWithGoogle(this.payWithGoogleOpts)
          .catch(err => assertDone(done, () => {
            assert.ok(err);
            assert.equal(err.code, 'google-pay-not-available');
            assert.equal(err.message, 'Google Pay is not available');
          }));
      });
    });

    context('when there are availability to pay with Google', function () {
      it('resolves the Google Pay button and a paymentData Emitter to get the user Payment Data', function (done) {
        this.stubGoogleApi();

        payWithGoogle(this.payWithGoogleOpts)
          .then((result) => assertDone(done, () => {
            assert.ok(result.$button);
            assert.ok(result.paymentDataEmitter);
            assert.ok(result.paymentDataEmitter instanceof Emitter);
          }));
      });

      it('creates the Google Pay button with the button options provided', function (done) {
        this.stubGoogleApi();

        payWithGoogle(this.payWithGoogleOpts)
          .finally(() => assertDone(done, () => {
            assert.equal(window.google.payments.api.PaymentsClient.prototype.createButton.getCall(0).args[0].color, 'RED');
          }));
      });

      it('do not request the user Payment Data until the Google Pay button is clicked', function (done) {
        this.stubGoogleApi();

        payWithGoogle(this.payWithGoogleOpts)
          .then(({ paymentDataEmitter }) => {
            const throwErr = () => done(new Error('expected paymentDataEmitter do not emit any event'));
            paymentDataEmitter.on('payment-data', throwErr);
            paymentDataEmitter.on('error', throwErr);
          });

        nextTick(() => assertDone(done, () => {
          assert.equal(window.google.payments.api.PaymentsClient.prototype.loadPaymentData.called, false);
        }));
      });

      context('when the Google Pay button is clicked', function () {
        it('requests the user Payment Data with the PaymentDataRequest provided', function (done) {
          this.stubGoogleApi();

          payWithGoogle(this.payWithGoogleOpts)
            .then(({ $button, paymentDataEmitter }) => {
              $button.click();
              paymentDataEmitter.on('payment-data', () =>  assertDone(done, () => {
                assert.equal(window.google.payments.api.PaymentsClient.prototype.loadPaymentData.getCall(0).args[0], 'PAYMENT DATA REQUEST');
              }));
            });
        });

        context('when fails requesting the user Payment Data', function () {
          beforeEach(function () {
            this.stubGoogleAPIOpts.loadPaymentData = Promise.reject(new Error('Failed to get the google payment data'));
          });

          it('the paymentData Emitter emits a google-pay-payment-failure error', function (done) {
            this.stubGoogleApi();

            payWithGoogle(this.payWithGoogleOpts)
              .then(({ $button, paymentDataEmitter }) => {
                $button.click();
                paymentDataEmitter.on('payment-data', () => done(new Error('expected paymentDataEmitter do not emit payment-data')));
                paymentDataEmitter.on('error', err => assertDone(done, () => {
                  assert.ok(err);
                  assert.equal(err.code, 'google-pay-payment-failure');
                  assert.equal(err.message, 'Google Pay could not get the Payment Data');
                }));
              });
          });
        });

        context('when success requesting the user Payment Data', function () {
          it('the paymentData Emitter emits the user Payment Data response', function (done) {
            this.stubGoogleApi();

            payWithGoogle(this.payWithGoogleOpts)
              .then(({ $button, paymentDataEmitter }) => {
                $button.click();
                paymentDataEmitter.on('error', () => done(new Error('expected paymentDataEmitter do not emit error')));
                paymentDataEmitter.on('payment-data', result => assertDone(done, () => {
                  assert.deepEqual(result, {
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
                  });
                }));
              });
          });
        });

        context('when the Google Pay button is clicked twice', function () {
          it('the paymentData Emitter emits the user Payment Data response twice', function (done) {
            this.stubGoogleApi();
            let paymentDataEventsCounter = 2;

            payWithGoogle(this.payWithGoogleOpts)
              .then(({ $button, paymentDataEmitter }) => {
                $button.click();
                $button.click();
                paymentDataEmitter.on('error', () => done(new Error('expected paymentDataEmitter do not emit error')));
                paymentDataEmitter.on('payment-data', result => {
                  const wrapDone = err => {
                    if (err) {
                      done(err);
                    }

                    paymentDataEventsCounter -= 1;
                    const isDone = paymentDataEventsCounter == 0;
                    if (isDone) {
                      done();
                    }
                  };

                  assertDone(wrapDone, () => {
                    assert.deepEqual(result, {
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
                    });
                  });
                });
              });
          });
        });
      });
    });
  });
});
