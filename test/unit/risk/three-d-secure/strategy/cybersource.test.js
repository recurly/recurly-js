import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, apiTest, testBed } from '../../../support/helpers';
import CybersourceStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/cybersource';
import actionToken from '../../../../server/fixtures/tokens/action-token-cybersource.json';
import Promise from 'promise';
import { Frame } from '../../../../../lib/recurly/frame';

describe('CybersourceStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');

    this.sandbox = sinon.createSandbox();
    this.sandbox.spy(recurly, 'Frame');

    this.Strategy = CybersourceStrategy;
    this.strategy = new CybersourceStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    const { sandbox, strategy } = this;
    strategy.remove();
    sandbox.restore();
  });

  describe('CybersourceStrategy.preflight', function () {
    beforeEach(function () {
      const { recurly } = this;
      this.sessionId = 'test-cybersource-session-id';
      this.number = '4111111111111111';
      this.month = '01';
      this.year = '2023';
      this.gateway_code = 'test-gateway-code';
      this.jwt = 'test-preflight-jwt';
      this.poll = setInterval(() => {
        // Stubs expected message format from Cybersource DDC
        recurly.bus.emit('raw-message', {
          data: JSON.stringify({
            MessageType: 'profile.completed',
            SessionId: this.sessionId
          })
        });
      }, 10);
    });

    it('returns a promise', function (done) {
      const { recurly, Strategy, number, month, year, gateway_code, poll } = this;

      const retValue = Strategy.preflight({ recurly, number, month, year, gateway_code }).then(() => {
        clearInterval(poll);
        done();
      });

      assert(retValue instanceof Promise);
    });

    it('constructs a frame to collect a session id', function (done) {
      const { recurly, Strategy, number, month, year, gateway_code, jwt, poll } = this;

      Strategy.preflight({ recurly, number, month, year, gateway_code }).then(() => {
        sinon.assert.callCount(recurly.Frame, 1);
        assert(recurly.Frame.calledWithMatch({
          path: '/risk/data_collector',
          payload: {
            jwt,
            redirect_url: 'https://centinelapistag.cardinalcommerce.com/V1/Cruise/Collect'
          },
          type: Frame.TYPES.IFRAME,
          height: 0,
          width: 0
        }));

        clearInterval(poll);
        done();
      });
    });

    it('resolves when a session id is received', function (done) {
      const { recurly, Strategy, sessionId, number, month, year, gateway_code, jwt, poll } = this;

      Strategy.preflight({ recurly, number, month, year, gateway_code }).then(preflightResponse => {
        assert.strictEqual(preflightResponse.session_id, sessionId);

        clearInterval(poll);
        done();
      });
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
