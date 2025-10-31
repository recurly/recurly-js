import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import HyperswitchStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/hyperswitch';
import actionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-hyperswitch.json';
import { Frame } from '../../../../../lib/recurly/frame';

describe('HyperswitchStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');

    this.sandbox = sinon.createSandbox();
    this.sandbox.spy(recurly, 'Frame');

    this.strategy = new HyperswitchStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    const { sandbox, strategy } = this;
    strategy.remove();
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
      assert.strictEqual(HyperswitchStrategy.strategyName, 'hyperswitch');
    });
  });

  describe('hyperswitchRedirectParams', function () {
    it('extracts redirect parameters from the action token', function () {
      const { strategy } = this;
      const params = strategy.hyperswitchRedirectParams;

      assert.deepStrictEqual(params, {
        redirect_url: 'https://3dsecure.hyperswitch.com/challenge/test-redirect-url',
        pa_req: undefined,
        md: undefined,
        creq: 'test-creq'
      });
    });
  });

  describe('attach', function () {

    describe('when hyperswitchRedirectParams contains redirect_url', function () {
      it('calls redirect method', function () {
        const { strategy, target, sandbox } = this;
        const redirectSpy = sandbox.spy(strategy, 'redirect');
        
        strategy.attach(target);
        
        assert(redirectSpy.calledOnce);
      });
    });

    describe('when hyperswitchRedirectParams is missing or has no redirect_url', function () {
      beforeEach(function () {
        const { strategy, sandbox, threeDSecure } = this;
        // Mock hyperswitchRedirectParams to return undefined or object without redirect_url
        sandbox.stub(strategy, 'hyperswitchRedirectParams').value(undefined);
        sandbox.stub(threeDSecure, 'error');
      });

      it('calls threeDSecure.error with correct error type', function () {
        const { strategy, target, threeDSecure } = this;
        
        strategy.attach(target);
        
        assert(threeDSecure.error.calledOnce);
        assert(threeDSecure.error.calledWith('3ds-auth-error', {
          cause: 'We could not determine an authentication method'
        }));
      });

      it('does not call redirect method', function () {
        const { strategy, target, sandbox } = this;
        const redirectSpy = sandbox.spy(strategy, 'redirect');
        
        strategy.attach(target);
        
        assert(redirectSpy.notCalled);
      });

      it('does not create a frame', function () {
        const { strategy, target, recurly } = this;
        
        strategy.attach(target);
        
        assert(recurly.Frame.notCalled);
      });
    });

    describe('when hyperswitchRedirectParams exists but redirect_url is missing', function () {
      beforeEach(function () {
        const { strategy, sandbox, threeDSecure } = this;
        // Mock hyperswitchRedirectParams to return object without redirect_url
        sandbox.stub(strategy, 'hyperswitchRedirectParams').value({ creq: 'test-creq' });
        sandbox.stub(threeDSecure, 'error');
      });

      it('calls threeDSecure.error when redirect_url is missing', function () {
        const { strategy, target, threeDSecure } = this;
        
        strategy.attach(target);
        
        assert(threeDSecure.error.calledOnce);
        assert(threeDSecure.error.calledWith('3ds-auth-error', {
          cause: 'We could not determine an authentication method'
        }));
      });
    });
  });

  describe('redirect', function () {
    beforeEach(function () {
      const { recurly, target, strategy } = this;
      strategy.attach(target);
      recurly.Frame.resetHistory();
    });

    it('creates a frame with the correct configuration', function () {
      const { strategy, recurly } = this;
      
      strategy.redirect();

      assert(recurly.Frame.calledOnce);
      assert(recurly.Frame.calledWithMatch({
        path: '/three_d_secure/start',
        type: Frame.TYPES.WINDOW,
        payload: {
          redirect_url: 'https://3dsecure.hyperswitch.com/challenge/test-redirect-url',
          three_d_secure_action_token_id: 'action-token-hyperswitch',
          creq: 'test-creq'
        },
        container: strategy.container,
        defaultEventName: 'hyperswitch-3ds-challenge'
      }));
    });

    it('includes all redirect parameters in the payload', function () {
      const { strategy, recurly } = this;
      
      strategy.redirect();

      const frameCall = recurly.Frame.getCall(0);
      const { payload } = frameCall.args[0];

      assert.strictEqual(payload.three_d_secure_action_token_id, 'action-token-hyperswitch');
      assert.strictEqual(payload.redirect_url, 'https://3dsecure.hyperswitch.com/challenge/test-redirect-url');
      assert.strictEqual(payload.creq, 'test-creq');
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
