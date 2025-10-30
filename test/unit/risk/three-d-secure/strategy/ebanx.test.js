import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import EbanxStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/ebanx';
import actionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-ebanx.json';
import { Frame } from '../../../../../lib/recurly/frame';

describe('EbanxStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function () {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-ebanx' });
    this.target = testBed().querySelector('#three-d-secure-container');
    this.sandbox = sinon.createSandbox();
    this.strategy = new EbanxStrategy({ threeDSecure, actionToken });
  });

  afterEach(function () {
    const { sandbox, strategy } = this;
    if (strategy.frame) {
      strategy.frame.destroy();
    }
    sandbox.restore();
  });

  describe('constructor', function () {
    it('marks itself as ready', function (done) {
      const { strategy } = this;
      strategy.whenReady(() => {
        assert(strategy._ready);
        done();
      });
    });

    it('sets the strategy name', function () {
      assert.strictEqual(EbanxStrategy.strategyName, 'ebanx');
    });
  });

  describe('attach', function () {
    beforeEach(function () {
      const { sandbox, recurly } = this;
      sandbox.spy(recurly, 'Frame');
    });

    it('creates a frame with the correct configuration', function () {
      const { strategy, target, recurly } = this;
      strategy.attach(target);

      assert(recurly.Frame.calledOnce);
      assert(recurly.Frame.calledWithMatch({
        path: '/three_d_secure/start',
        type: Frame.TYPES.WINDOW,
        payload: {
          redirect_url: 'https://3dsecure.ebanx.com/challenge/test-redirect-url',
          three_d_secure_action_token_id: 'action-token-ebanx'
        },
        container: strategy.container
      }));
    });

    it('includes additional params from action token while excluding url', function () {
      const { target, recurly, threeDSecure } = this;
      const customActionToken = {
        ...actionToken,
        three_d_secure: {
          params: {
            url: 'https://3dsecure.ebanx.com/challenge/test-redirect-url',
            custom_param: 'custom_value',
            another_param: 'another_value'
          }
        }
      };
      
      const customStrategy = new EbanxStrategy({ 
        threeDSecure, 
        actionToken: customActionToken 
      });
      customStrategy.attach(target);

      assert(recurly.Frame.calledOnce);
      const frameCall = recurly.Frame.getCall(0);
      assert.strictEqual(frameCall.args[0].payload.redirect_url, 'https://3dsecure.ebanx.com/challenge/test-redirect-url');
      assert.strictEqual(frameCall.args[0].payload.custom_param, 'custom_value');
      assert.strictEqual(frameCall.args[0].payload.another_param, 'another_value');
      assert.strictEqual(frameCall.args[0].payload.url, undefined, 'url should not be in payload');
    });

    it('assigns the target element as parent', function () {
      const { strategy, target } = this;
      assert.strictEqual(strategy.parent, undefined);
      strategy.attach(target);
      assert.strictEqual(strategy.parent, target);
    });

    it('sets up error event handling', function (done) {
      const { strategy, target, threeDSecure } = this;
      const testError = new Error('Test error');
      
      threeDSecure.error = sinon.spy((errorCode, details) => {
        assert.strictEqual(errorCode, '3ds-auth-error');
        assert.strictEqual(details.cause, testError);
        done();
      });

      strategy.attach(target);
      strategy.frame.emit('error', testError);
    });

    it('sets up done event handling', function (done) {
      const { strategy, target } = this;
      const testResults = { success: true, token: 'test-token' };
      
      strategy.on('done', (results) => {
        assert.deepStrictEqual(results, testResults);
        done();
      });

      strategy.attach(target);
      strategy.frame.emit('done', testResults);
    });
  });

  describe('remove', function () {
    beforeEach(function () {
      const { strategy, target } = this;
      strategy.attach(target);
    });

    it('destroys the frame if it exists', function () {
      const { strategy, sandbox } = this;
      sandbox.spy(strategy.frame, 'destroy');
      strategy.remove();
      assert(strategy.frame.destroy.calledOnce);
    });

    it('calls the parent remove method', function () {
      const { strategy, sandbox } = this;
      sandbox.spy(Object.getPrototypeOf(Object.getPrototypeOf(strategy)), 'remove');
      strategy.remove();
      assert(Object.getPrototypeOf(Object.getPrototypeOf(strategy)).remove.calledOnce);
    });

    it('handles the case when no frame exists', function () {
      const { strategy } = this;
      strategy.frame = null;
      strategy.remove();
    });
  });
});
