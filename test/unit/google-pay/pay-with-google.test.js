import assert from 'assert';
import dom from '../../../lib/util/dom';
import { assertDone, stubPromise, stubGooglePaymentAPI } from '../support/helpers';
import { payWithGoogle } from '../../../lib/recurly/google-pay/pay-with-google';

describe('Pay with Google', function () {
  before(() => {
    stubPromise();
  });

  beforeEach(function () {
    const isReadyToPayRequest = {
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedCardNetworks: ['VISA'],
            allowedAuthMethods: ['PAN_ONLY'],
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: 'PAYMENT_GATEWAY_PARAMETERS',
          },
        },
      ],
    };

    this.payWithGoogleOpts = {
      environment: 'TEST',
      isReadyToPayRequest,
      paymentDataRequest: {
        ...isReadyToPayRequest,
        merchantInfo: { merchantId: 'abc123', merchantName: 'abc123' },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: '1.00',
          currencyCode: 'USD',
          countryCode: 'US',
        },
      },
      buttonOptions: {
        color: 'RED',
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
          assert.deepEqual(
            window.google.payments.api.PaymentsClient.prototype.isReadyToPay.getCall(0).args[0],
            this.payWithGoogleOpts.isReadyToPayRequest);
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
      it('creates the Google Pay button with the button options provided', function (done) {
        this.stubGoogleApi();

        payWithGoogle(this.payWithGoogleOpts)
          .then((button) => assertDone(done, () => {
            assert.equal('RED', button.properties.color);
            assert.deepEqual(
              this.payWithGoogleOpts.isReadyToPayRequest.allowedPaymentMethods,
              button.properties.allowedPaymentMethods);
          }));
      });

      it('prefetches the payment data with a pending price', function (done) {
        this.stubGoogleApi();

        const prefetchTransactionInfo = {
          ...this.payWithGoogleOpts.paymentDataRequest.transactionInfo,
          totalPriceStatus: 'NOT_CURRENTLY_KNOWN',
        };

        payWithGoogle(this.payWithGoogleOpts)
          .then(() => assertDone(done, () => {
            assert(window.google.payments.api.PaymentsClient.prototype.prefetchPaymentData.called);
            assert(window.google.payments.api.PaymentsClient.prototype.prefetchPaymentData.getCall(0).args[0], {
              ...this.payWithGoogleOpts.paymentDataRequest,
              transactionInfo: prefetchTransactionInfo,
            });
          }));
      });
    });
  });
});
