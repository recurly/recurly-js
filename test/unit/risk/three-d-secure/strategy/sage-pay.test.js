import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import SagePayStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/sage-pay';
import actionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-sage-pay.json';

describe('SagePayStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');

    this.sandbox = sinon.createSandbox();
    this.sandbox.spy(recurly, 'Frame');

    this.strategy = new SagePayStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    const { recurly, sandbox, strategy } = this;
    recurly.destroy();
    strategy.remove();
    sandbox.restore();
  });

  describe('attach', function () {
    it('creates a frame using the actionToken params', function () {
      const { strategy, target, recurly } = this;
      strategy.attach(target);
      assert(recurly.Frame.calledOnce);
      assert(recurly.Frame.calledWithMatch({
        path: '/three_d_secure/start',
        payload: {
          redirect_url: 'test-sage-pay-acs-url',
          pa_req: 'test-sage-pay-pa-req',
          md: 'test-sage-pay-md',
          creq: 'test-sage-pay-creq',
          three_d_secure_action_token_id: 'action-token-sage-pay'
        },
        defaultEventName: 'sagepay-3ds-challenge'
      }));
    });
  });

  describe('remove', function () {
    it('destroys any existing frame', function () {
      const { strategy, target, sandbox } = this;
      strategy.attach(target);
      sandbox.spy(strategy.frame, 'destroy');
      strategy.remove();
      assert(strategy.frame.destroy.calledOnce);
    });
  });
});
