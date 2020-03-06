import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import StripeStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/stripe';
import actionToken from '../../../../server/fixtures/tokens/action-token-stripe.json';
import Promise from 'promise';

describe('StripeStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');
    this.sandbox = sinon.createSandbox();
    this.isIE = !!document.documentMode;

    if (this.isIE) window.Promise = Promise;
    this.exampleResult = {
      paymentIntent: { id: 'test-id', test: 'result', consistingOf: 'arbitrary-values' }
    };
    this.stripe = {
      handleCardAction: sinon.stub().resolves(this.exampleResult)
    };
    window.Stripe = sinon.spy(publishableKey => this.stripe);

    this.strategy = new StripeStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    const { isIE, sandbox } = this;
    sandbox.restore();
    delete window.Stripe;
    if (isIE) delete window.Promise;
  });

  it('instantiates Stripe.js with the Stripe publishable key', function (done) {
    const { strategy } = this;
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
      this.strategy = new StripeStrategy({ threeDSecure, actionToken });
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
    it('instructs Stripe.js to handle the card action using the client secret', function () {
      const { strategy, target, stripe } = this;
      strategy.attach(target);
      assert(stripe.handleCardAction.calledOnce);
      assert(stripe.handleCardAction.calledWithExactly('test-stripe-client-secret'));
    });

    it('emits done with the paymentIntent result', function (done) {
      const { strategy, target, exampleResult: { paymentIntent: { id } } } = this;
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
        strategy.stripe.handleCardAction = sinon.stub().resolves(this.exampleResult);
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
