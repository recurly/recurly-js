import assert from 'assert';
import Promise from 'promise';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import StripeStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/stripe';
import actionTokenPaymentIntent from '@recurly/public-api-test-server/fixtures/tokens/action-token-stripe-pi.json';
import actionTokenSetupIntent from '@recurly/public-api-test-server/fixtures/tokens/action-token-stripe-seti.json';

describe('StripeStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function () {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();

    this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');
    this.sandbox = sinon.createSandbox();

    this.intentResult = {
      paymentIntent: { id: 'pi-test-id', test: 'result', consistingOf: 'arbitrary-values' }
    };
    this.stripe = {
      handleNextAction: sinon.stub().resolves(this.intentResult),
    };
    window.Stripe = sinon.spy(() => this.stripe);

    this.sandbox.stub(StripeStrategy.prototype, 'loadStripeLibrary').usingPromise(Promise).resolves();
  });

  afterEach(function () {
    const { sandbox } = this;
    sandbox.restore();
    delete window.Stripe;
  });

  it('instantiates Stripe.js with the Stripe publishable key', function (done) {
    window.Stripe = sinon.spy(() => this.stripe);
    const { threeDSecure } = this;
    const strategy = new StripeStrategy({ threeDSecure, actionToken: actionTokenPaymentIntent });

    strategy.whenReady(() => {
      assert(window.Stripe.calledOnce);
      assert(window.Stripe.calledWithExactly('test-stripe-publishable-key'));
      strategy.remove();
      done();
    });
  });

  describe('attach', function () {
    describe('payment intents', function () {
      beforeEach(function (done) {
        const { threeDSecure } = this;
        this.strategy = new StripeStrategy({ threeDSecure, actionToken: actionTokenPaymentIntent });
        this.strategy.whenReady(() => done());
      });

      afterEach(function () {
        this.strategy.remove();
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
            strategy.remove();
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

      afterEach(function () {
        this.strategy.remove();
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
