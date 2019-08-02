import assert from 'assert';
import { applyFixtures } from '../support/fixtures';
import { initRecurly, nextTick, testBed } from '../support/helpers';
import { ThreeDSecure } from '../../lib/recurly/risk/three-d-secure/three-d-secure';
import AdyenStrategy from '../../lib/recurly/risk/three-d-secure/strategy/adyen';
import StripeStrategy from '../../lib/recurly/risk/three-d-secure/strategy/stripe';
import TestStrategy from '../../lib/recurly/risk/three-d-secure/strategy/test';
import ThreeDSecureStrategy from '../../lib/recurly/risk/three-d-secure/strategy';

describe('ThreeDSecure', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const actionTokenId = this.actionTokenId = 'action-token-test';
    const recurly = this.recurly = initRecurly();
    const risk = this.risk = { add: sinon.stub(), remove: sinon.stub(), recurly };
    const sandbox = this.sandbox = sinon.createSandbox();

    this.container = testBed().querySelector('#three-d-secure-container');
    this.threeDSecure = new ThreeDSecure({ risk, actionTokenId });

    // Neuter the third party lib loaders
    window.AdyenCheckout = sandbox.stub();
    window.Stripe = sandbox.stub();
    sandbox.stub(AdyenStrategy.prototype, 'loadAdyenLibrary').resolves();
    sandbox.stub(StripeStrategy.prototype, 'loadStripeLibrary').resolves();

    sandbox.spy(recurly, 'Frame');

    this.threeDSecure.whenReady(() => done());
  });

  afterEach(function () {
    const { sandbox } = this;
    const { Frame } = this.recurly;
    delete window.AdyenCheckout;
    delete window.Stripe;
    Frame.getCalls().forEach(c => c.returnValue.destroy());
    sandbox.restore();
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

  describe('recurly', function () {
    it('references the risk recurly instance', function () {
      const { threeDSecure, risk } = this;

      assert.strictEqual(threeDSecure.recurly, risk.recurly);
    });
  });

  describe('when an actionTokenId is valid', function () {
    it('sets the strategy according to the gateway type of the action token', function (done) {
      const { risk } = this;
      [
        { id: 'action-token-adyen', strategy: AdyenStrategy },
        { id: 'action-token-stripe', strategy: StripeStrategy },
        { id: 'action-token-test', strategy: TestStrategy }
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
    it('sets a null strategy', function () {
      const { risk } = this;
      const threeDSecure = new ThreeDSecure({ risk });

      assert.strictEqual(threeDSecure.strategy.constructor, ThreeDSecureStrategy);
    });
  });

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
});
