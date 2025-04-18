import assert from 'assert';
import { applyFixtures } from './support/fixtures';
import { initRecurly, nextTick, testBed } from './support/helpers';
import { isAUid } from './support/matchers';
import { Recurly } from '../../lib/recurly';
import CheckoutPricing from '../../lib/recurly/pricing/checkout';
import Elements from '../../lib/recurly/elements';
import SubscriptionPricing from '../../lib/recurly/pricing/subscription';

describe('Recurly', function () {
  beforeEach(function () {
    this.recurly = new Recurly;
    this.sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    this.sandbox.reset();
  });

  it('should have a version', function () {
    const { recurly } = this;
    assert(typeof recurly.version === 'string');
  });

  it('should be an event emitter', function () {
    const { recurly } = this;
    assert(recurly.on && recurly.emit);
  });

  it('should be exposed as a window singleton', function () {
    assert(window.recurly instanceof window.recurly.Recurly);
  });

  describe('Recurly', function () {
    it('is the Recurly constructor', function () {
      const { recurly } = this;
      assert.strictEqual(recurly.Recurly, recurly.constructor);
      assert(recurly.Recurly() instanceof Recurly);
    });
  });

  describe('id', function () {
    beforeEach(function () { this.subject = this.recurly.id; });
    it(...isAUid());
  })

  describe('deviceId', function () {
    beforeEach(function () { this.subject = this.recurly.deviceId; });
    it(...isAUid());

    it('is set on localStorage', function () {
      const { subject } = this;
      assert.strictEqual(subject, localStorage.getItem('__recurly__.deviceId'));
    });
  });

  describe('sessionId', function () {
    beforeEach(function () { this.subject = this.recurly.sessionId; });
    it(...isAUid());

    it('is set on sessionStorage', function () {
      const { subject } = this;
      assert.strictEqual(subject, sessionStorage.getItem('__recurly__.sessionId'));
    });
  });

  describe('isCanaryOneThousandthSession', function () {
    beforeEach(function () { this.subject = this.recurly.isCanaryOneThousandthSession; });

    it('is a Boolean set on sessionStorage as a string', function () {
      const { subject } = this;
      assert.strictEqual(typeof subject, 'boolean');
      assert.strictEqual(subject.toString(), sessionStorage.getItem('__recurly__.isCanaryOneThousandthSession'));
    });
  });

  describe('configure', function () {
    describe('when called repeatedly', function () {
      it('persists bus recipients', function () {
        const { recurly, sandbox } = this;
        const stub = sandbox.stub();
        initRecurly(recurly);
        recurly.bus.add(stub);
        assert.strictEqual(!!~recurly.bus.recipients.indexOf(stub), true);
        recurly.configure({ publicKey: 'test-2' });
        assert.strictEqual(!!~recurly.bus.recipients.indexOf(stub), true);
      });

      describe('when hostedFields are not finished initializing', function () {
        applyFixtures();

        this.ctx.fixture = 'multipleForms';

        it('resets hostedFields and abandons the prior listeners', function (done) {
          const { recurly, sandbox } = this;
          const readyStub = sandbox.stub();
          sandbox.spy(recurly, 'off');
          assert.strictEqual(recurly.readyState, 0);
          initRecurly(recurly, {
            fields: {
              number: { selector: '#number-1' },
              month: { selector: '#month-1' },
              year: { selector: '#year-1' },
              cvv: { selector: '#cvv-1' }
            }
          });
          assert.strictEqual(recurly.readyState, 1);
          assert(recurly.off.notCalled);
          recurly.configure({
            fields: {
              number: { selector: '#number-2' },
              month: { selector: '#month-2' },
              year: { selector: '#year-2' },
              cvv: { selector: '#cvv-2' }
            }
          });
          assert.strictEqual(recurly.readyState, 1);
          recurly.on('hostedFields:ready', readyStub);

          recurly.ready(() => {
            // perform on next tick to allow the ready callback stack to proceed to the stub
            nextTick(() => {
              assert.strictEqual(recurly.readyState, 2);
              assert(readyStub.calledOnce);
              assert.strictEqual(testBed().querySelectorAll('#test-form-1 iframe').length, 0);
              assert.strictEqual(testBed().querySelectorAll('#test-form-2 iframe').length, 4);
              assert(recurly.off.calledWithExactly('hostedFields:ready'));
              assert(recurly.off.calledWithExactly('hostedFields:state:change'));
              assert(recurly.off.calledWithExactly('hostedField:submit'));
              done();
            });
          });
        });
      });
    });

    describe('when switching form different keyspaces', function () {
      const DEFAULT_API_URL = 'https://api.recurly.com/js/v1';
      const DEFAULT_API_URL_EU = 'https://api.eu.recurly.com/js/v1';
      const SAMPLE_API = 'https://api.test.com';
      describe('when publicKey of merchant is from eu', function () {
        it('returns the eu api url', function () {
          const recurly = new Recurly;
          recurly.configure({ publicKey: 'fra-2test2' });
          assert.strictEqual(recurly.config.api, DEFAULT_API_URL_EU);
        });
      });
      describe('when publicKey of merchant is from us', function () {
        it('returns the us api url', function () {
          const recurly = new Recurly;
          recurly.configure({ publicKey: 'ewr-1test1' });
          assert.strictEqual(recurly.config.api, DEFAULT_API_URL);
        });
      });
      describe('when publicKey is from eu and api is passed', function () {
        it('returns the default api url', function () {
          const recurly = initRecurly({ publicKey: 'fra-3test3', api: SAMPLE_API });
          assert.strictEqual(recurly.config.api, SAMPLE_API);
        });
      });
      describe('when publicKey is from us and api is passed', function () {
        it('returns the default api url', function () {
          const recurly = initRecurly({ publicKey: 'ewr-3test3', api: SAMPLE_API });
          assert.strictEqual(recurly.config.api, SAMPLE_API);
        });
      });
    });

    describe('when proactive3ds', function () {
      describe('is set to true', function() {
        it('returns true', function () {
          const recurly = initRecurly({
            risk: {
              threeDSecure: {
                proactive: {
                  enabled: true
                }
              }
            }
          });
          assert.strictEqual(recurly.config.risk.threeDSecure.proactive.enabled, true);
        });
      });
      describe('is not set', function() {
        it('returns false', function () {
          const recurly = initRecurly({});
          assert.strictEqual(recurly.config.risk.threeDSecure.proactive.enabled, false);
        });
      })
    });
  });

  describe('destroy', function () {
    it('disables listeners', function () {
      const { recurly } = this;
      const listener = sinon.stub();

      recurly.on('test-event', listener);
      assert(listener.notCalled);

      recurly.emit('test-event');
      assert(listener.calledOnce);
      assert.strictEqual(recurly.hasListeners('test-event'), true);

      recurly.destroy();

      assert.strictEqual(recurly.hasListeners('test-event'), false);
      recurly.emit('test-event');

      listener.reset()
      assert(listener.notCalled);
    });

    it('sends a destroy message to its bus', function () {
      const { recurly } = this;
      recurly.bus = { send: sinon.stub(), destroy: sinon.stub() };
      assert(recurly.bus.send.notCalled);
      assert(recurly.bus.destroy.notCalled);

      recurly.destroy();

      assert(recurly.bus.send.calledOnce);
      assert(recurly.bus.send.calledWithExactly('destroy'));
      assert(recurly.bus.destroy.calledOnce);
    });

    it('destroys its fraud module', function () {
      const { recurly } = this;
      recurly.fraud = { destroy: sinon.stub() };
      assert(recurly.fraud.destroy.notCalled);

      recurly.destroy();

      assert(recurly.fraud.destroy.calledOnce);
    });

    it('destroys its reporter', function () {
      const { recurly } = this;
      const stubReporter = { destroy: sinon.stub() };
      recurly.reporter = stubReporter;
      assert(stubReporter.destroy.notCalled);

      recurly.destroy();

      assert(stubReporter.destroy.calledOnce);
      assert.strictEqual(recurly.reporter, undefined);
    });
  });

  describe('Pricing factories', function () {
    it('has a CheckoutPricing factory at recurly.Pricing.Checkout', function () {
      const { recurly } = this;
      assert(recurly.Pricing.Checkout() instanceof CheckoutPricing);
    });

    it('has a SubscriptionPricing factory at recurly.Pricing.Subscription', function () {
      const { recurly } = this;
      assert(recurly.Pricing.Subscription() instanceof SubscriptionPricing);
    });

    it('has a SubscriptionPricing factory at recurly.Pricing', function () {
      const { recurly } = this;
      assert(recurly.Pricing() instanceof SubscriptionPricing);
    });
  });

  describe('events', function () {
    describe('hosted field events', function () {
      beforeEach(function () {
        const { recurly } = this;
        sinon.spy(recurly, 'report');
        this.hostedFieldsStub = {
          state: { testField: { type: 'test-type', valid: 'test-valid', empty: 'test-empty' } }
        };
        recurly.hostedFields = this.hostedFieldsStub;
      });

      it('binds hosted field focus and blur events to report calls', function () {
        const { recurly, hostedFieldsStub } = this;
        recurly.emit('hostedField:focus', { type: 'testField' });
        assert(recurly.report.calledOnce);
        assert(recurly.report.calledWithMatch(
          'hosted-field:focus',
          hostedFieldsStub.state.testField
        ));
      });
    });
  });

  describe('Elements factory', () => {
    it('has an Elements factory at recurly.Elements', function () {
      const { recurly } = this;
      assert(recurly.Elements() instanceof Elements);
    });
  });
});
