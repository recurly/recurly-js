import assert from 'assert';
import { isAUid } from './support/matchers';
import { Recurly } from '../lib/recurly';
import CheckoutPricing from '../lib/recurly/pricing/checkout';
import Elements from '../lib/recurly/elements';
import SubscriptionPricing from '../lib/recurly/pricing/subscription';

describe('Recurly', function () {
  beforeEach(function () {
    this.recurly = new Recurly;
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
      assert(recurly.Elements() instanceof Elements);
    });
  });
});
