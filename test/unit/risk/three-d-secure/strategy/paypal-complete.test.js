import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import PaypalCompleteStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/paypal-complete';
import actionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-paypal-complete.json';
import { Frame } from '../../../../../lib/recurly/frame';

describe('PaypalCompleteStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');

    this.sandbox = sinon.createSandbox();
    this.sandbox.spy(recurly, 'Frame');

    this.strategy = new PaypalCompleteStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    this.strategy.remove();
    this.sandbox.restore();
  });

  describe.only('attach', function () {
    it('creates a frame and appends finish URL to the redirect URL', function () {
      const { strategy, target, recurly } = this;
      strategy.attach(target);
      assert(recurly.Frame.calledOnce);

      const redirectURL = actionToken.three_d_secure.params.redirect.url;
      const finishURL = `http://${window.location.host}/api/three_d_secure/finish?key=test&event=paypalcomplete-3ds-challenge`;
      const redirectWithFinishURL = `${redirectURL}&redirect_uri=${encodeURIComponent(finishURL)}`;

      assert(recurly.Frame.calledWithMatch({
        path: '/three_d_secure/start',
        container: strategy.container,
        type: Frame.TYPES.IFRAME,
        payload: {
          redirect_url: redirectWithFinishURL,
          three_d_secure_action_token_id: 'action-token-test'
        },
        defaultEventName: 'paypalcomplete-3ds-challenge'
      }));
    });

    it('when liability shift is possible then emits DONE event', function () {
      const { strategy, target } = this;
      this.sandbox.spy(strategy, 'emit');
      strategy.attach(target);

      strategy.frame.emit('done', { liability_shift: 'POSSIBLE' });

      assert(strategy.emit.calledWithMatch('done', { liability_shift: 'POSSIBLE' }));
    });

    it('when liability shift is not possible then emits ERROR event', function () {
      const { strategy, target } = this;
      const { threeDSecure } = strategy;
      this.sandbox.spy(threeDSecure, 'error');
      strategy.attach(target);

      strategy.frame.emit('done', { liability_shift: 'NO' });

      assert(threeDSecure.error.calledWithMatch('3ds-auth-error', { cause: 'Liability shift not possible' }));
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
