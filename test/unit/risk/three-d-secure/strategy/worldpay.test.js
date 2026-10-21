import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import WorldpayStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/worldpay';
import actionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-worldpay.json';
import Promise from 'promise';
import { Frame } from '../../../../../lib/recurly/frame';

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
    const { recurly, sandbox, strategy } = this;
    recurly.destroy();
    strategy.remove();
    sandbox.restore();
  });

  describe('WorldpayStrategy.preflight', function () {
    beforeEach(function () {
      const { recurly } = this;
      this.sessionId = 'test-worldpay-session-id';
      this.number = '4111111111111111';
      this.jwt = 'test-preflight-jwt';
      this.deviceDataCollectionUrl = 'https://secure-test.worldpay.com/shopper/3ds/ddc.html';
      this.simulatePreflightResponse = () => {
        // Stubs expected message format from Worldpay DDC - Device Data Collection
        recurly.bus.emit('raw-message', {
          data: JSON.stringify({
            MessageType: 'profile.completed',
            SessionId: this.sessionId
          })
        });
      };
    });

    it('returns a promise', function (done) {
      const { recurly, Strategy, number, jwt, deviceDataCollectionUrl, simulatePreflightResponse } = this;
      const retValue = Strategy.preflight({ recurly, number, jwt, deviceDataCollectionUrl }).then(() => done());
      assert(retValue instanceof Promise);
      simulatePreflightResponse();
    });

    it('constructs a frame to collect a session id', function (done) {
      const { recurly, Strategy, number, jwt, deviceDataCollectionUrl, simulatePreflightResponse } = this;

      Strategy.preflight({ recurly, number, jwt, deviceDataCollectionUrl }).then(() => done());

      assert(recurly.Frame.calledOnce);
      assert(recurly.Frame.calledWithMatch({
        path: '/risk/data_collector',
        payload: {
          bin: number.substr(0,6),
          jwt,
          redirect_url: deviceDataCollectionUrl
        },
        type: Frame.TYPES.IFRAME,
        height: 0,
        width: 0
      }));

      simulatePreflightResponse();
    });

    it('resolves when a session id is received', function (done) {
      const { recurly, Strategy, number, jwt, deviceDataCollectionUrl, sessionId, simulatePreflightResponse } = this;

      Strategy.preflight({ recurly, number, jwt, deviceDataCollectionUrl }).then(preflightResponse => {
        assert.strictEqual(preflightResponse.results.session_id, sessionId);
        done();
      });

      simulatePreflightResponse();
    });

    describe('device data collection', function () {
      describe('device data collection disabled when set to false', function () {
        beforeEach(function () {
          this.recurly.config.risk.threeDSecure.preflightDeviceDataCollector = {
            enabled: false
          };
        });

        it('does not construct a frame to collect a session id', function (done) {
          const { recurly, Strategy, number, month, year, gateway_code } = this;

          Strategy.preflight({ recurly, number, month, year, gateway_code }).then(() => {
            sinon.assert.callCount(recurly.Frame, 0);
            done();
          });
        });
      });

      describe('device data collection enabled when set to true', function () {
        beforeEach(function () {
          this.recurly.config.risk.threeDSecure.preflightDeviceDataCollector = {
            enabled: true
          };
        });

        it('does construct a frame to collect a session id', function (done) {
          const { recurly, Strategy, number, month, year, gateway_code, simulatePreflightResponse } = this;

          Strategy.preflight({ recurly, number, month, year, gateway_code }).then(() => {
            sinon.assert.callCount(recurly.Frame, 1);
            done();
          });

          simulatePreflightResponse();
        });
      });

      describe('device data collection enabled when object is present', function () {
        beforeEach(function () {
          this.recurly.config.risk.threeDSecure.preflightDeviceDataCollector = {
            enabled: true,
            billingInfoId: 'test-billing-info-id',
          };
        });

        it('does construct a frame to collect a session id', function (done) {
          const { recurly, Strategy, number, month, year, gateway_code, simulatePreflightResponse } = this;

          Strategy.preflight({ recurly, number, month, year, gateway_code }).then(() => {
            sinon.assert.callCount(recurly.Frame, 1);
            done();
          });

          simulatePreflightResponse();
        });
      });
    });

    describe('when the device data collection preflight times out', function () {
      beforeEach(function () {
        const { sandbox } = this;
        sandbox.stub(WorldpayStrategy, 'PREFLIGHT_TIMEOUT').value(10);
      });

      it('resolves with a risk-preflight-timeout error rather than rejecting', function (done) {
        const { recurly, Strategy, number, jwt, deviceDataCollectionUrl } = this;

        Strategy.preflight({ recurly, number, jwt, deviceDataCollectionUrl }).then(
          preflightResponse => {
            assert.strictEqual(preflightResponse.code, 'risk-preflight-timeout');
            assert.strictEqual(preflightResponse.processor, 'worldpay');
            done();
          },
          err => done(err)
        );
      });
    });

    describe('when the preflight times out once and the retry succeeds', function () {
      beforeEach(function () {
        const { sandbox } = this;
        sandbox.stub(WorldpayStrategy, 'PREFLIGHT_TIMEOUT').value(25);
      });

      it('retries once and resolves with the session id from the retry', function (done) {
        const { recurly, Strategy, number, jwt, deviceDataCollectionUrl, sessionId, simulatePreflightResponse } = this;

        // emit only once the retry (second frame) is live, so attempt 1 loses the race
        const emitOnRetry = () => {
          if (recurly.Frame.callCount >= 2) return simulatePreflightResponse();
          setTimeout(emitOnRetry, 5);
        };
        setTimeout(emitOnRetry, 5);

        Strategy.preflight({ recurly, number, jwt, deviceDataCollectionUrl })
          .then(preflightResponse => {
            assert.deepStrictEqual(preflightResponse, { results: { session_id: sessionId } });
            assert.strictEqual(recurly.Frame.callCount, 2);
            done();
          })
          .catch(err => done(err));
      });
    });

    describe('when the preflight times out twice', function () {
      beforeEach(function () {
        const { sandbox } = this;
        sandbox.stub(WorldpayStrategy, 'PREFLIGHT_TIMEOUT').value(10);
        // stub frame creation so the loaded page's own frame-event message cannot
        // race the timers and self-destroy frames ahead of teardown — keeps destroy counts deterministic
        sandbox.stub(Frame.prototype, 'create');
        sandbox.spy(Frame.prototype, 'destroy');
      });

      it('retries exactly once, tears down each attempt, and resolves with the timeout error', function (done) {
        const { recurly, Strategy, number, jwt, deviceDataCollectionUrl } = this;

        Strategy.preflight({ recurly, number, jwt, deviceDataCollectionUrl })
          .then(preflightResponse => {
            assert.strictEqual(preflightResponse.code, 'risk-preflight-timeout');
            assert.strictEqual(preflightResponse.processor, 'worldpay');
            assert.strictEqual(recurly.Frame.callCount, 2);
            assert.strictEqual(Frame.prototype.destroy.callCount, 2);
            done();
          })
          .catch(err => done(err));
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
