import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import SagepayStrategy from '../../../../lib/recurly/risk/three-d-secure/strategy/sagepay';
import actionToken from '../../../server/fixtures/tokens/action-token-sagepay.json';
import Promise from 'promise';

describe.only('SagepayStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');

    this.sandbox = sinon.createSandbox();
    this.sandbox.spy(recurly, 'Frame');

    this.strategy = new SagepayStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    const { sandbox, strategy } = this;
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
          redirect_url: 'test-sagepay-acs-url',
          pa_req: 'test-sagepay-pa-req',
          md: 'test-sagepay-md'
        }
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
