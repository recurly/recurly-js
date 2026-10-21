import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import CybersourceStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/cybersource';
import actionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-cybersource.json';
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
    const { recurly, sandbox, strategy } = this;
    recurly.destroy();
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
      const { recurly, Strategy, sessionId, number, month, year, gateway_code, poll } = this;

      Strategy.preflight({ recurly, number, month, year, gateway_code }).then(preflightResponse => {
        assert.strictEqual(preflightResponse.results.session_id, sessionId);

        clearInterval(poll);
        done();
      });
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

        it('does not construct a frame when a token is provided', function (done) {
          const { recurly, Strategy, gateway_code } = this;
          const token = { id: 'test-token-id' };

          Strategy.preflight({ recurly, gateway_code, token }).then(() => {
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
          const { recurly, Strategy, number, month, year, gateway_code } = this;

          Strategy.preflight({ recurly, number, month, year, gateway_code }).then(() => {
            sinon.assert.callCount(recurly.Frame, 1);
            done();
          });
        });

        it('does construct a frame when a token is provided', function (done) {
          const { recurly, Strategy, gateway_code, poll } = this;
          const token = { id: 'test-token-id' };

          Strategy.preflight({ recurly, gateway_code, token }).then(() => {
            sinon.assert.callCount(recurly.Frame, 1);
            clearInterval(poll);
            done();
          });
        });
      });

      describe('device data collection enabled when object is preset', function () {
        beforeEach(function () {
          this.recurly.config.risk.threeDSecure.preflightDeviceDataCollector = {
            enabled: true,
            billingInfoId: 'test-billing-info-id',
          };
        });

        it('does construct a frame to collect a session id', function (done) {
          const { recurly, Strategy, number, month, year, gateway_code } = this;

          Strategy.preflight({ recurly, number, month, year, gateway_code }).then(() => {
            sinon.assert.callCount(recurly.Frame, 1);
            done();
          });
        });
      });
    });

    describe('when the device data collection preflight times out', function () {
      beforeEach(function () {
        const { sandbox, poll } = this;
        clearInterval(poll); // neutralize the shared profile.completed poll — the timeout must win the race
        sandbox.stub(CybersourceStrategy, 'PREFLIGHT_TIMEOUT').value(10);
      });

      it('resolves with a risk-preflight-timeout error rather than rejecting', function (done) {
        const { recurly, Strategy, number, month, year, gateway_code } = this;

        Strategy.preflight({ recurly, number, month, year, gateway_code }).then(
          preflightResponse => {
            assert.strictEqual(preflightResponse.code, 'risk-preflight-timeout');
            assert.strictEqual(preflightResponse.processor, 'cybersource');
            done();
          },
          err => done(err)
        );
      });
    });

    describe('when the preflight times out once and the retry succeeds', function () {
      beforeEach(function () {
        const { sandbox, poll } = this;
        clearInterval(poll);
        sandbox.stub(CybersourceStrategy, 'PREFLIGHT_TIMEOUT').value(25);
      });

      it('retries once and resolves with the session id from the retry', function (done) {
        const { recurly, Strategy, number, month, year, gateway_code, sessionId } = this;

        // emit only once the retry (second frame) is live, so attempt 1 loses the race
        const emitOnRetry = () => {
          if (recurly.Frame.callCount < 2) return setTimeout(emitOnRetry, 5);
          recurly.bus.emit('raw-message', {
            data: JSON.stringify({
              MessageType: 'profile.completed',
              SessionId: sessionId
            })
          });
        };
        setTimeout(emitOnRetry, 5);

        Strategy.preflight({ recurly, number, month, year, gateway_code })
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
        const { sandbox, poll, recurly } = this;
        clearInterval(poll);
        sandbox.stub(CybersourceStrategy, 'PREFLIGHT_TIMEOUT').value(10);
        sandbox.stub(recurly.request, 'post').callsFake(() => Promise.resolve({
          jwt: 'test-preflight-jwt',
          deviceDataCollectionUrl: 'https://centinelapistag.cardinalcommerce.com/V1/Cruise/Collect'
        }));
        // stub frame creation so the loaded page's own frame-event message cannot
        // race the timers and self-destroy frames ahead of teardown — keeps destroy counts deterministic
        sandbox.stub(Frame.prototype, 'create');
        sandbox.spy(Frame.prototype, 'destroy');
      });

      it('retries exactly once, tears down each attempt, and resolves with the timeout error', function (done) {
        const { recurly, Strategy, number, month, year, gateway_code } = this;

        Strategy.preflight({ recurly, number, month, year, gateway_code })
          .then(preflightResponse => {
            assert.strictEqual(preflightResponse.code, 'risk-preflight-timeout');
            assert.strictEqual(preflightResponse.processor, 'cybersource');
            assert.strictEqual(recurly.request.post.callCount, 2);
            assert.strictEqual(recurly.Frame.callCount, 2);
            assert.strictEqual(Frame.prototype.destroy.callCount, 2);
            done();
          })
          .catch(err => done(err));
      });
    });

    describe('when the retry authentication setup fails', function () {
      beforeEach(function () {
        const { sandbox, poll, recurly } = this;
        clearInterval(poll);
        sandbox.stub(CybersourceStrategy, 'PREFLIGHT_TIMEOUT').value(10);
        sandbox.stub(recurly.request, 'post').callsFake(() => {
          if (recurly.request.post.callCount === 1) {
            return Promise.resolve({
              jwt: 'test-preflight-jwt',
              deviceDataCollectionUrl: 'https://centinelapistag.cardinalcommerce.com/V1/Cruise/Collect'
            });
          }
          return Promise.reject(new Error('retry authentication setup failed'));
        });
      });

      it('degrades without an entry rather than rejecting', function (done) {
        const { recurly, Strategy, number, month, year, gateway_code } = this;

        Strategy.preflight({ recurly, number, month, year, gateway_code })
          .then(preflightResponse => {
            assert.strictEqual(preflightResponse, undefined);
            assert.strictEqual(recurly.request.post.callCount, 2);
            assert.strictEqual(recurly.Frame.callCount, 1);
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
