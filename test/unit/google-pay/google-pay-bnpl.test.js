import assert from 'assert';
import recurlyError from '../../../lib/recurly/errors';
import { initRecurly, nextTick, assertDone, stubGooglePaymentAPI } from '../support/helpers';
import dom from '../../../lib/util/dom';

function bnplPaymentData ({ provider = 'affirm' } = {}) {
  // Mirrors structure the Google API returns and what our code expects
  return {
    paymentMethodData: {
      type: 'CARD',
      description: provider, // e.g. 'affirm', 'klarna'
      info: {
        cardNetwork: 'VISA',
        cardDetails: provider, // BNPL marker instead of 4 digits
        billingAddress: {
          name: 'BNPL User',
          address1: '1 Main St',
          address2: '',
          address3: '',
          sortingCode: '',
          locality: 'Austin',
          administrativeArea: 'TX',
          postalCode: '78701',
          countryCode: 'US',
        },
      },
      tokenizationData: {
        type: 'PAYMENT_GATEWAY',
        token: '{"id":"tok_ignored_for_bnpl"}',
      },
    },
  };
}

function nonBnplPaymentData () {
  return {
    paymentMethodData: {
      type: 'CARD',
      description: 'Visa •••• 1111',
      info: {
        cardNetwork: 'VISA',
        cardDetails: '1111',
        billingAddress: {
          name: 'John Smith',
          address1: '1600 Amphitheatre Parkway',
          address2: '',
          address3: '',
          sortingCode: '',
          locality: 'Mountain View',
          administrativeArea: 'CA',
          postalCode: '94043',
          countryCode: 'US',
        },
      },
      tokenizationData: {
        type: 'PAYMENT_GATEWAY',
        token: '{"id":"tok_123"}',
      },
    },
  };
}

describe('Google Pay BNPL guard', function () {
  beforeEach(function () {
    this.sandbox = sinon.createSandbox();

    this.recurly = initRecurly();
    this.googlePayOpts = {
      environment: undefined,
      googleMerchantId: 'GOOGLE_MERCHANT_ID_123',
      googleBusinessName: 'RECURLY',
      total: '1',
      country: 'US',
      currency: 'USD',
      billingAddressRequired: true,
      gatewayCode: 'gateway_123',
    };

    this.stubRequestOpts = {
      info: Promise.resolve({
        siteMode: 'test',
        paymentMethods: [
          {
            gatewayCode: 'gateway_123',
            cardNetworks: ['VISA'],
            authMethods: ['PAN_ONLY'],
            paymentGateway: 'PAYMENT_GATEWAY_PARAMETERS',
          },
        ],
      }),
      token: Promise.resolve({ id: 'TOKEN_123' }),
    };

    this.stubGoogleAPIOpts = { dom };
    this.stubRequestAndGoogleApi = () => {
      this.cleanGoogleAPIStub = stubGooglePaymentAPI(this.stubGoogleAPIOpts);
      this.sandbox.stub(this.recurly.request, 'get').resolves(this.stubRequestOpts.info);
      this.sandbox.stub(this.recurly.request, 'post').resolves(this.stubRequestOpts.token);
    };
  });

  afterEach(function () {
    this.recurly.destroy();
    this.sandbox.restore();
    if (this.cleanGoogleAPIStub) this.cleanGoogleAPIStub();
  });

  it('blocks BNPL before tokenization and emits a merchant error', function (done) {
    // Simulate Google Pay returning BNPL selection (e.g., Affirm)
    this.stubGoogleAPIOpts.loadPaymentData = Promise.resolve(bnplPaymentData({ provider: 'affirm' }));
    this.stubRequestAndGoogleApi();

    const emitter = this.recurly.GooglePay(this.googlePayOpts);

    emitter.on('ready', button => {
      // Ensure we don’t emit a token
      emitter.on('token', () => done(new Error('expected to not emit a token event')));
      // Expect BNPL error and no tokenization call
      emitter.on('error', (err) => assertDone(done, () => {
        assert.ok(err);
        assert.equal(err.code, 'google-pay-bnpl-not-supported');
        assert.equal(this.recurly.request.post.called, false, 'should not call /google_pay/token');
      }));
      nextTick(() => button.click());
    });
  });

  it('maps BNPL rejection to PAYMENT_DATA_INVALID in onPaymentAuthorized path', function (done) {
    this.stubGoogleAPIOpts.loadPaymentData = Promise.resolve(bnplPaymentData({ provider: 'klarna' }));
    this.stubRequestAndGoogleApi();

    const onPaymentAuthorized = this.sandbox.stub(); // should NOT be called on BNPL error
    const emitter = this.recurly.GooglePay({
      ...this.googlePayOpts,
      callbacks: { onPaymentAuthorized },
    });

    emitter.on('ready', button => {
      // Grab the wrapped onPaymentAuthorized provided to Google
      const { onPaymentAuthorized: wrapped } =
        window.google.payments.api.PaymentsClient.getCall(0).args[0].paymentDataCallbacks;

      nextTick(() => {
        // Simulate the Google sheet flow: click and then invoke wrapped authorization handler
        button.click()
          .then(wrapped)
          .then(res => assertDone(done, () => {
            assert.equal(this.recurly.request.post.called, false, 'should not call /google_pay/token');
            assert.equal(res.transactionState, 'ERROR');
            assert.ok(res.error);
            assert.equal(res.error.reason, 'PAYMENT_DATA_INVALID');
            assert.match(res.error.message, /not supported/i);
            assert(!onPaymentAuthorized.called, 'merchant onPaymentAuthorized should not be called on BNPL error');
          }))
          .catch(done);
      });
    });
  });

  it('continues normally for non-BNPL and emits token and paymentAuthorized', function (done) {
    this.stubGoogleAPIOpts.loadPaymentData = Promise.resolve(nonBnplPaymentData());
    this.stubRequestAndGoogleApi();

    const emitter = this.recurly.GooglePay(this.googlePayOpts);

    emitter.on('ready', button => {
      let gotToken, gotPaymentAuthorized;

      emitter.on('token', tok => { gotToken = tok; });
      emitter.on('paymentAuthorized', pd => { gotPaymentAuthorized = pd; });

      nextTick(() => {
        button.click().then(() => assertDone(done, () => {
          assert.equal(this.recurly.request.post.called, true, 'should call /google_pay/token');
          assert.ok(gotToken);
          assert.deepEqual(gotToken, { id: 'TOKEN_123' });
          assert.ok(gotPaymentAuthorized);
        }));
      });
    });
  });

  it('exposes the BNPL not supported error via errors()', function () {
    const err = recurlyError('google-pay-bnpl-not-supported');
    assert.equal(err.code, 'google-pay-bnpl-not-supported');
    assert.match(err.message, /not supported/i);
  });
});
