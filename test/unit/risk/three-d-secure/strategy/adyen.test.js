import assert from 'assert';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import AdyenStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/adyen';
import actionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-adyen.json';
import fingerprintActionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-adyen-fingerprint.json';
import fallbackActionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-adyen-3ds1.json';
import componentRedirectActionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-adyen-component-redirect.json';
import componentThreeDSecureRedirectActionToken from '@recurly/public-api-test-server/fixtures/tokens/action-token-adyen-component-three-d-secure-redirect.json';
import { Frame } from '../../../../../lib/recurly/frame';

describe('AdyenStrategy', function () {
  this.ctx.fixture = 'threeDSecure';

  applyFixtures();

  beforeEach(function (done) {
    const recurly = this.recurly = initRecurly();
    const risk = recurly.Risk();
    const threeDSecure = this.threeDSecure = risk.ThreeDSecure({ actionTokenId: 'action-token-test' });
    this.target = testBed().querySelector('#three-d-secure-container');
    this.sandbox = sinon.createSandbox();

    // Stubbing Adyen's 3D Secure concerns
    this.exampleResult = {
      data: {
        details: {
          'threeds2.fingerprint': 'arbitrary',
          'threeds2.challengeResult': 'values'
        }
      }
    };
    this.adyenService = { mount: sinon.spy() };
    this.adyenCheckout = {
      create: sinon.spy(() => this.adyenService)
    };
    window.AdyenCheckout = sinon.spy(() => this.adyenCheckout);

    this.strategy = new AdyenStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    delete window.AdyenCheckout;
    this.recurly.destroy();
    this.strategy.remove();
    this.sandbox.restore();
  });

  it('instantiates AdyenCheckout', function (done) {
    const { strategy, adyenCheckout } = this;
    strategy.whenReady(() => {
      assert(window.AdyenCheckout.calledOnce);
      assert.strictEqual(strategy.adyenCheckout, adyenCheckout);
      done();
    });
  });

  describe('when the adyen.js library encounters a load error', function () {
    beforeEach(function () {
      const { sandbox, threeDSecure } = this;
      sandbox.stub(AdyenStrategy, 'libUrl').get(() => '/api/mock-404');
      delete window.AdyenCheckout;
      this.strategy.remove();
      this.strategy = new AdyenStrategy({ threeDSecure, actionToken });
    });

    it('emits an error on threeDSecure', function (done) {
      const { threeDSecure } = this;
      threeDSecure.on('error', error => {
        assert.strictEqual(error.code, '3ds-vendor-load-error');
        assert.strictEqual(error.vendor, 'Adyen');
        done();
      });
    });
  });

  describe('attach', function () {
    describe('when challenging', function () {
      it('creates a 3DS challenge through AdyenCheckout', function () {
        const { strategy, target, adyenCheckout, adyenService } = this;
        strategy.attach(target);
        assert(adyenCheckout.create.calledOnce);
        assert(adyenCheckout.create.calledWithMatch('threeDS2Challenge', {
          challengeToken: 'test-challenge-token',
          onComplete: sinon.match.func,
          onError: sinon.match.func,
          size: '05'
        }));
        assert(adyenService.mount.calledOnce);
        assert(adyenService.mount.calledWithExactly(strategy.container));
      });
    });

    describe('when fingerprinting', function () {
      beforeEach(function (done) {
        const { threeDSecure } = this;
        this.strategy.remove();
        this.strategy = new AdyenStrategy({ threeDSecure, actionToken: fingerprintActionToken });
        this.strategy.whenReady(() => done());
      });

      it('creates a device fingerprint through AdyenCheckout', function () {
        const { strategy, target, adyenCheckout, adyenService } = this;
        strategy.attach(target);
        assert(adyenCheckout.create.calledOnce);
        assert(adyenCheckout.create.calledWithMatch('threeDS2DeviceFingerprint', {
          fingerprintToken: 'test-fingerprint-token',
          onComplete: sinon.match.func,
          onError: sinon.match.func
        }));
        assert(adyenService.mount.calledOnce);
        assert(adyenService.mount.calledWithExactly(strategy.container));
      });
    });

    describe('when falling back to 3DS 1.0', function () {
      beforeEach(setupFallback);

      it('creates a 3DS 1.0 challenge frame', function () {
        const { recurly, target, strategy } = this;
        strategy.attach(target);
        assert(recurly.Frame.calledOnce);
        assert(recurly.Frame.calledWithMatch({
          type: Frame.TYPES.IFRAME,
          path: '/three_d_secure/start',
          payload: {
            redirect_url: 'test-url',
            pa_req: 'test-pa-req',
            md: 'test-md',
            three_d_secure_action_token_id: fallbackActionToken.id
          },
          container: strategy.container,
          defaultEventName: 'adyen-3ds-challenge'
        }));
      });
    });

    describe('when redirecting for an Adyen Component using 3-D Secure', () => {
      beforeEach(function () {
        const { threeDSecure, sandbox, recurly } = this;
        sandbox.spy(recurly, 'Frame');
        this.strategy.remove();
        this.strategy = new AdyenStrategy({ threeDSecure, actionToken: componentThreeDSecureRedirectActionToken });
      });

      it('redirects using an expected payload', function () {
        const { recurly, target, strategy } = this;
        strategy.attach(target);
        assert(recurly.Frame.calledOnce);
        assert(recurly.Frame.calledWithMatch({
          type: Frame.TYPES.IFRAME,
          path: '/three_d_secure/start',
          payload: {
            redirect_url: 'test-url',
            pa_req: 'test-pa-req',
            md: 'test-md',
            three_d_secure_action_token_id: componentThreeDSecureRedirectActionToken.id
          },
          container: strategy.container,
          defaultEventName: 'adyen-3ds-challenge'
        }));
      });
    });

    describe('when redirecting for an Adyen Component not using 3-D Secure', () => {
      beforeEach(function () {
        const { threeDSecure, sandbox, recurly } = this;
        sandbox.spy(recurly, 'Frame');
        this.strategy.remove();
        this.strategy = new AdyenStrategy({ threeDSecure, actionToken: componentRedirectActionToken });
      });

      it('redirects using an expected payload', function () {
        const { recurly, target, strategy } = this;
        strategy.attach(target);
        assert(recurly.Frame.calledOnce);
        assert(recurly.Frame.calledWithMatch({
          type: Frame.TYPES.WINDOW,
          path: '/three_d_secure/start',
          payload: {
            redirect_url: 'test-url',
            three_d_secure_action_token_id: componentRedirectActionToken.id
          },
          container: strategy.container,
          defaultEventName: 'adyen-3ds-challenge'
        }));
      });
    });
  });

  describe('remove', function () {
    describe('when falling back to 3DS 1.0', function () {
      beforeEach(setupFallback);

      it('destroys any existing frame', function () {
        const { strategy, target, sandbox } = this;
        strategy.attach(target);
        sandbox.spy(strategy.frame, 'destroy');
        strategy.remove();
        assert(strategy.frame.destroy.calledOnce);
      });
    });
  });

  function setupFallback () {
    const { threeDSecure, sandbox, recurly } = this;
    sandbox.spy(recurly, 'Frame');
    this.strategy.remove();
    this.strategy = new AdyenStrategy({ threeDSecure, actionToken: fallbackActionToken });
  }
});
