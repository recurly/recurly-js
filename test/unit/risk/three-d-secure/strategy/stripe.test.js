import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import StripeStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/stripe';
import actionTokenPaymentIntent from '@recurly/public-api-test-server/fixtures/tokens/action-token-stripe-pi.json';
import actionTokenSetupIntent from '@recurly/public-api-test-server/fixtures/tokens/action-token-stripe-seti.json';
import Promise from 'promise';

describe('StripeStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function () {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');
    this.sandbox = sinon.createSandbox();

    this.intentResult = {
      paymentIntent: { id: 'pi-test-id', test: 'result', consistingOf: 'arbitrary-values' }
    };
    this.stripe = {
      handleNextAction: sinon.stub().resolves(this.intentResult),
    };
    window.Stripe = sinon.spy(publishableKey => this.stripe);
  });

  afterEach(function () {
    const { sandbox } = this;
    sandbox.restore();
    delete window.Stripe;
  });

  it('instantiates Stripe.js with the Stripe publishable key', function (done) {
    window.Stripe = sinon.spy(publishableKey => this.stripe);
    const { threeDSecure } = this;
    const strategy = new StripeStrategy({ threeDSecure, actionToken: actionTokenPaymentIntent });

    strategy.whenReady(() => {
      assert(window.Stripe.calledOnce);
      assert(window.Stripe.calledWithExactly('test-stripe-publishable-key'));
      done();
    });
  });

  describe('when the Stripe.js library encounters a load error', function () {
    beforeEach(function () {
      const { sandbox, threeDSecure } = this;
      sandbox.stub(StripeStrategy, 'libUrl').get(() => '/api/mock-404');
      delete window.Stripe;
      this.strategy = new StripeStrategy({ threeDSecure, actionToken: actionTokenPaymentIntent });
    });

    it('emits an error on threeDSecure', function (done) {
      const { threeDSecure } = this;
      threeDSecure.on('error', error => {
        assert.strictEqual(error.code, '3ds-vendor-load-error');
        assert.strictEqual(error.vendor, 'Stripe');
        done();
      })
    });
  });

  describe('attach', function () {
    describe('payment intents', function () {
      beforeEach(function (done) {
        const { threeDSecure } = this;
        this.strategy = new StripeStrategy({ threeDSecure, actionToken: actionTokenPaymentIntent });
        this.strategy.whenReady(() => done());
      });

      it('instructs Stripe.js to handle the card action using the client secret', function () {
        const { strategy, target, stripe } = this;
        strategy.attach(target);
        assert(stripe.handleNextAction.calledOnce);
        assert(stripe.handleNextAction.calledWithExactly({ clientSecret: 'pi-test-stripe-client-secret' }));
      });

      it('emits done with the paymentIntent result', function (done) {
        const { strategy, target, intentResult: { paymentIntent: { id } } } = this;
        strategy.on('done', result => {
          assert.deepEqual(result, { id });
          done();
        });
        strategy.attach(target);
      });

      describe('when Stripe.js produces an authentication error', function () {
        beforeEach(function () {
          const { strategy } = this;
          this.exampleResult = { error: { example: 'error', for: 'testing' } };
          strategy.stripe.handleNextAction = sinon.stub().resolves(this.exampleResult);
        });

        it('emits an error on threeDSecure', function (done) {
          const { threeDSecure, strategy, target, exampleResult: { error: example } } = this;
          threeDSecure.on('error', error => {
            assert.strictEqual(error.code, '3ds-auth-error');
            assert.deepEqual(error.cause, example);
            done();
          });
          strategy.attach(target);
        });
      });
    });

    describe('setup intents', function () {
      beforeEach(function (done) {
        const { threeDSecure } = this;
        this.strategy = new StripeStrategy({ threeDSecure, actionToken: actionTokenSetupIntent });
        this.strategy.whenReady(() => done());
        this.intentResult = {
          setupIntent: { id: 'pi-test-id', test: 'result', consistingOf: 'arbitrary-values' }
        };
      });

      it('instructs Stripe.js to handle the card action using the client secret', function () {
        const { strategy, target, stripe } = this;
        strategy.attach(target);
        assert(stripe.handleNextAction.calledOnce);
        assert(stripe.handleNextAction.calledWithExactly({ clientSecret: 'seti-test-stripe-client-secret' }));
      });

      it('emits done with the setupIntent result', function (done) {
        const { strategy, target, intentResult: { setupIntent: { id } } } = this;
        strategy.on('done', result => {
          assert.deepEqual(result, { id });
          done();
        });
        strategy.attach(target);
      });

      describe('when Stripe.js produces an authentication error', function () {
        beforeEach(function () {
          const { strategy } = this;
          this.exampleResult = { error: { example: 'error', for: 'testing' } };
          strategy.stripe.handleNextAction = sinon.stub().resolves(this.exampleResult);
        });

        it('emits an error on threeDSecure', function (done) {
          const { threeDSecure, strategy, target, exampleResult: { error: example } } = this;
          threeDSecure.on('error', error => {
            assert.strictEqual(error.code, '3ds-auth-error');
            assert.deepEqual(error.cause, example);
            done();
          });
          strategy.attach(target);
        });
      });
    });
  });
});
