import assert from 'assert';
import Promise from 'promise';
import { applyFixtures } from '../../../support/fixtures';
import { initRecurly, testBed } from '../../../support/helpers';
import AdyenStrategy from '../../../../../lib/recurly/risk/three-d-secure/strategy/adyen';
import actionToken from '../../../../server/fixtures/tokens/action-token-adyen.json';
import fingerprintActionToken from '../../../../server/fixtures/tokens/action-token-adyen-fingerprint.json';
import fallbackActionToken from '../../../../server/fixtures/tokens/action-token-adyen-3ds1.json';
import { Frame } from '../../../../../lib/recurly/frame'

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
      create: sinon.spy((serviceType, opts) => {
        const token = opts.fingerprintToken || opts.challengeToken;
        return this.adyenService;
      })
    };
    window.AdyenCheckout = sinon.spy(() => this.adyenCheckout);

    this.strategy = new AdyenStrategy({ threeDSecure, actionToken });
    this.strategy.whenReady(() => done());
  });

  afterEach(function () {
    const { sandbox } = this;
    delete window.AdyenCheckout;
    sandbox.restore();
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
            PaReq: 'test-pa-req',
            MD: 'test-md'
          },
          container: strategy.container
        }));
        strategy.remove();
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
    this.strategy = new AdyenStrategy({ threeDSecure, actionToken: fallbackActionToken });
  }
});
