import assert from 'assert';
import Promise from 'promise';
import { applyFixtures } from '../support/fixtures';
import { initRecurly, nextTick, testBed } from '../support/helpers';
import { factory, ThreeDSecure } from '../../../lib/recurly/risk/three-d-secure/three-d-secure';
import AdyenStrategy from '../../../lib/recurly/risk/three-d-secure/strategy/adyen';
import BraintreeStrategy from '../../../lib/recurly/risk/three-d-secure/strategy/braintree';
import SagepayStrategy from '../../../lib/recurly/risk/three-d-secure/strategy/sage-pay';
import StripeStrategy from '../../../lib/recurly/risk/three-d-secure/strategy/stripe';
import TestStrategy from '../../../lib/recurly/risk/three-d-secure/strategy/test';
import ThreeDSecureStrategy from '../../../lib/recurly/risk/three-d-secure/strategy';
import WirecardStrategy from '../../../lib/recurly/risk/three-d-secure/strategy/wirecard';
import WorldpayStrategy from '../../../lib/recurly/risk/three-d-secure/strategy/worldpay';

describe('ThreeDSecure', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const actionTokenId = this.actionTokenId = 'action-token-test';
    const recurly = this.recurly = initRecurly();
    const risk = this.risk = { add: sinon.stub(), remove: sinon.stub(),concerns: [], recurly };
    const sandbox = this.sandbox = sinon.createSandbox();

    // Neuter the third party lib loaders
    window.AdyenCheckout = sandbox.stub();
    window.braintree = sandbox.stub();
    window.Stripe = sandbox.stub();
    sandbox.stub(AdyenStrategy.prototype, 'loadAdyenLibrary').usingPromise(Promise).resolves();
    sandbox.stub(BraintreeStrategy.prototype, 'loadBraintreeLibraries').usingPromise(Promise).resolves();
    sandbox.stub(StripeStrategy.prototype, 'loadStripeLibrary').usingPromise(Promise).resolves();

    sandbox.spy(recurly, 'Frame');

    this.container = testBed().querySelector('#three-d-secure-container');
    this.threeDSecure = new ThreeDSecure({ risk, actionTokenId });
    this.threeDSecure.whenReady(() => done());
  });

  afterEach(function () {
    const { sandbox } = this;
    const { Frame } = this.recurly;
    delete window.AdyenCheckout;
    delete window.braintree;
    delete window.Stripe;
    Frame.getCalls().forEach(c => c.returnValue.destroy());
    sandbox.restore();
  });

  describe('factory', function () {
    beforeEach(function () {
      const { sandbox, recurly } = this;
      this.riskStub = { add: sandbox.stub(), recurly, concerns: [] };
    });

    it('returns a ThreeDSecure instance', function () {
      const { actionTokenId, riskStub } = this;
      const threeDSecure = factory.call(riskStub, { actionTokenId });
      assert(threeDSecure instanceof ThreeDSecure);
    });

    it('sets its Risk reference from the calling context', function () {
      const { actionTokenId, riskStub } = this;
      const threeDSecure = factory.call(riskStub, { actionTokenId });
      assert.strictEqual(threeDSecure.risk, riskStub);
    });

    it('sets challengeWindowSize from options', function(){
      const challengeWindowSize = ThreeDSecure.CHALLENGE_WINDOW_SIZE_03_500_X_600;
      const { actionTokenId, riskStub } = this;
      const threeDSecure = factory.call(riskStub, { actionTokenId, challengeWindowSize });
      assert.strictEqual(threeDSecure.challengeWindowSize, challengeWindowSize);
    });
  });

  describe('ThreeDSecure.getStrategyForGatewayType', function () {
    it('returns a ThreeDSecureStrategy given a valid type', function () {
      assert.strictEqual(ThreeDSecure.getStrategyForGatewayType('test'), TestStrategy);
    });

    it('returns undefined given an invalid type', function () {
      assert.strictEqual(ThreeDSecure.getStrategyForGatewayType('invalid'), undefined);
    });
  });

  describe('ThreeDSecure.preflight', function () {
    beforeEach(function () {
      const { sandbox } = this;
      this.bin = '411111';
      this.preflights = [
        {
          gateway: { type: 'test-gateway-type' },
          params: { arbitrary: 'test-params' }
        }
      ];
      sandbox.stub(ThreeDSecure, 'getStrategyForGatewayType').callsFake(() => ({
        preflight: sandbox.stub().usingPromise(Promise).resolves({ arbitrary: 'test-results' })
      }));
    });

    it('returns a promise', function (done) {
      const { recurly, bin, preflights } = this;
      const returnValue = ThreeDSecure.preflight({ recurly, bin, preflights }).then(() => done());
      assert(returnValue instanceof Promise);
    });

    it('resolves with preflight results from strategies', function (done) {
      const { recurly, bin, preflights } = this;
      const returnValue = ThreeDSecure.preflight({ recurly, bin, preflights })
        .done(response => {
          const [{ processor, results }] = response;
          assert.strictEqual(Array.isArray(response), true);
          assert.strictEqual(processor, 'test-gateway-type');
          assert.deepStrictEqual(results, { arbitrary: 'test-results' });
          done();
        });
    });
  });

  it('adds itself to the provided Risk instance', function () {
    const { threeDSecure, risk } = this;

    assert(risk.add.calledOnce);
    assert(risk.add.calledWithExactly(threeDSecure));
  });

  it('reports its creation', function () {
    const { risk, actionTokenId } = this;

    risk.recurly.reporter.send.reset();
    const threeDSecure = new ThreeDSecure({ risk, actionTokenId });

    assert(risk.recurly.reporter.send.calledOnce);
    assert(risk.recurly.reporter.send.calledWithMatch(
      'three-d-secure:create',
      { concernId: threeDSecure.id, actionTokenId }
    ));
  });

  describe('when a threeDSecure instance already exists', function () {
    it('throws and errror and prevents another one from being added', function () {
      const { risk, actionTokenId, threeDSecure } = this;
      risk.concerns.push(threeDSecure);

      assert.throws(() => {
        new ThreeDSecure({ risk, actionTokenId });
      }, /More than one instance of 3DS was initialized./);
      assert(risk.add.calledOnce);
    });
  });

  describe('recurly', function () {
    it('references the risk recurly instance', function () {
      const { threeDSecure, risk } = this;

      assert.strictEqual(threeDSecure.recurly, risk.recurly);
    });
  });

  describe('when an actionTokenId is not valid', function () {
    it('emits an error', function (done) {
      const { risk } = this;
      const threeDSecure = new ThreeDSecure({ risk, actionTokenId: 'invalid-token-id' });

      threeDSecure.on('error', err => {
        assert.strictEqual(err.code, 'not-found');
        assert.strictEqual(err.message, 'Token not found');
        done();
      });
    });
  });

  describe('when an actionTokenId is not provided', function () {
    it('throws an error', function () {
      const { risk } = this;

      assert.throws(() => {
        new ThreeDSecure({ risk });
      }, /Option actionTokenId must be a three_d_secure_action_token_id/);
    });
  });

  describe('when an actionTokenId is valid', function () {
    it('sets the strategy according to the gateway type of the action token', function (done) {
      const { risk } = this;
      [
        { id: 'action-token-adyen', strategy: AdyenStrategy },
        { id: 'action-token-braintree', strategy: BraintreeStrategy },
        { id: 'action-token-sage-pay', strategy: SagepayStrategy },
        { id: 'action-token-stripe', strategy: StripeStrategy },
        { id: 'action-token-test', strategy: TestStrategy },
        { id: 'action-token-wirecard', strategy: WirecardStrategy },
        { id: 'action-token-worldpay', strategy: WorldpayStrategy }
      ].forEach(({ id: actionTokenId, strategy }) => {
        const threeDSecure = new ThreeDSecure({ risk, actionTokenId });
        threeDSecure.whenReady(() => {
          assert(threeDSecure.strategy instanceof strategy);
          done();
        });
      });
    });

    it('constructs the strategy with the action token', function (done) {
      const { risk, actionTokenId } = this;
      const threeDSecure = new ThreeDSecure({ risk, actionTokenId });
      threeDSecure.whenReady(() => {
        const { strategy } = threeDSecure;
        assert(strategy instanceof TestStrategy);
        assert.strictEqual(strategy.actionToken.id, actionTokenId);
        done();
      });
    });

    it('reports the strategy name', function (done) {
      const { risk, actionTokenId } = this;

      const threeDSecure = new ThreeDSecure({ risk, actionTokenId });
      risk.recurly.reporter.send.reset();

      threeDSecure.whenReady(() => {
        assert(risk.recurly.reporter.send.calledOnce);
        assert(risk.recurly.reporter.send.calledWithMatch(
          'three-d-secure:ready',
          { concernId: threeDSecure.id, strategy: 'test' }
        ));
        done();
      });
    });

    it('calls onStrategyDone when a strategy completes', function (done) {
      const { sandbox, threeDSecure } = this;
      const example = { arbitrary: 'test-payload' };
      sandbox.spy(threeDSecure, 'onStrategyDone');

      threeDSecure.whenReady(() => {
        threeDSecure.strategy.emit('done', example);
        assert(threeDSecure.onStrategyDone.calledOnce);
        assert(threeDSecure.onStrategyDone.calledWithMatch(example));
        done();
      });
    });
  });

  describe('challengeWindowSize', function() {
    it('validates', function () {
      const challengeWindowSize = 'xx';
      const { risk, actionTokenId } = this;
      assert.throws(() => {
        new ThreeDSecure({ risk, actionTokenId, challengeWindowSize });
      }, /Invalid challengeWindowSize. Expected any of 01,02,03,04,05, got xx/);
    });

    it('uses the default value when not provided', function () {
      const { risk, actionTokenId } = this;
      const threeDSecure = new ThreeDSecure({ risk, actionTokenId });
      assert.strictEqual(threeDSecure.challengeWindowSize, ThreeDSecure.CHALLENGE_WINDOW_SIZE_DEFAULT);
    });
  })

  describe('attach', function () {
    it('defers to the strategy', function (done) {
      const { threeDSecure, container, sandbox } = this;

      threeDSecure.whenReady(() => {
        sandbox.spy(threeDSecure.strategy, 'attach');
        threeDSecure.attach(container);
        assert(threeDSecure.strategy.attach.calledOnce);
        assert(threeDSecure.strategy.attach.calledWithExactly(container));
        done();
      });
    });

    it('reports attachment', function (done) {
      const { risk, threeDSecure, container } = this;

      threeDSecure.whenReady(() => {
        risk.recurly.reporter.send.reset();
        threeDSecure.attach(container);
        assert(risk.recurly.reporter.send.calledOnce);
        assert(risk.recurly.reporter.send.calledWithMatch(
          'three-d-secure:attach',
          { concernId: threeDSecure.id }
        ));
        done();
      });
    });
  });

  describe('remove', function () {
    beforeEach(function (done) {
      const { threeDSecure, container } = this;

      threeDSecure.attach(container);
      threeDSecure.whenReady(() => done());
    })

    it('defers to the strategy', function () {
      const { threeDSecure, sandbox } = this;

      sandbox.spy(threeDSecure.strategy, 'remove');
      threeDSecure.remove();
      assert(threeDSecure.strategy.remove.calledOnce);
    });

    it('reports removal', function () {
      const { risk, threeDSecure } = this;

      risk.recurly.reporter.send.reset();
      threeDSecure.remove();
      assert(risk.recurly.reporter.send.calledOnce);
      assert(risk.recurly.reporter.send.calledWithMatch(
        'three-d-secure:remove',
        { concernId: threeDSecure.id }
      ));
    });
  });

  describe('onStrategyDone', function () {
    it('emits a three_d_secure_action_result token', function (done) {
      const { sandbox, threeDSecure } = this;
      const example = { arbitrary: 'test-payload' };
      sandbox.spy(threeDSecure, 'onStrategyDone');

      threeDSecure.on('token', token => {
        assert.deepStrictEqual(token, {
          type: 'three_d_secure_action_result',
          id: '3dsart-id-test'
        })
        done();
      });

      threeDSecure.whenReady(() => {
        threeDSecure.strategy.emit('done', example);
      });
    });
  });
});
