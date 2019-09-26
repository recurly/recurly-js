import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import WorldpayStrategy from '../../../../lib/recurly/risk/three-d-secure/strategy/worldpay';
import actionToken from '../../../server/fixtures/tokens/action-token-worldpay.json';
import Promise from 'promise';
import { TYPE } from '../../../../lib/recurly/frame';

describe('WorldpayStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');

    this.sandbox = sinon.createSandbox();
    this.sandbox.spy(recurly, 'Frame');

    this.Strategy = WorldpayStrategy;
    this.strategy = new WorldpayStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    const { sandbox, strategy } = this;
    strategy.remove();
    sandbox.restore();
  });

  describe('WorldpayStrategy.preflight', function () {
    beforeEach(function () {
      const { recurly } = this;
      this.sessionId = 'test-worldpay-session-id';
      this.bin = '411111';
      this.jwt = 'test-preflight-jwt';
      this.simulatePreflightResponse = () => {
        // Stubs expected message format from Worldpay DDC
        recurly.bus.emit('raw-message', {
          data: JSON.stringify({
            MessageType: 'profile.completed',
            SessionId: this.sessionId
          })
        });
      };
    });

    it('returns a promise', function (done) {
      const { recurly, Strategy, bin, jwt, simulatePreflightResponse } = this;
      const retValue = Strategy.preflight({ recurly, bin, jwt }).then(() => done());
      assert(retValue instanceof Promise);
      simulatePreflightResponse();
    });

    it('constructs a frame to collect a session id', function (done) {
      const { recurly, Strategy, bin, jwt, simulatePreflightResponse } = this;

      Strategy.preflight({ recurly, bin, jwt }).then(() => done());

      assert(recurly.Frame.calledOnce);
      assert(recurly.Frame.calledWithMatch({
        path: '/risk/data_collector',
        payload: {
          bin,
          jwt,
          redirect_url: 'https://secure-test.worldpay.com/shopper/3ds/ddc.html'
        },
        type: TYPE.IFRAME,
        height: 0,
        width: 0
      }));

      simulatePreflightResponse();
    });

    it('resolves when a session id is received', function (done) {
      const { recurly, Strategy, bin, jwt, sessionId, simulatePreflightResponse } = this;

      Strategy.preflight({ recurly, bin, jwt }).then(preflightResponse => {
        assert.strictEqual(preflightResponse.session_id, sessionId);
        done();
      });

      simulatePreflightResponse();
    });
  });

  describe('attach', function () {
    it('creates a frame using the actionToken params', function () {
      const { strategy, target, recurly } = this;
      strategy.attach(target);
      assert(recurly.Frame.calledOnce);
      assert(recurly.Frame.calledWithMatch({
        path: '/three_d_secure/start',
        payload: {
          redirect_url: actionToken.three_d_secure.params.redirect_url,
          three_d_secure_action_token_id: actionToken.id
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
