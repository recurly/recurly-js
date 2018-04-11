import assert from 'assert';
import {isUuidv4} from './support/helpers';
import {Recurly} from '../lib/recurly';
import CheckoutPricing from '../lib/recurly/pricing/checkout';
import SubscriptionPricing from '../lib/recurly/pricing/subscription';

describe('Recurly', () => {
  let recurly;

  beforeEach(() => recurly = new Recurly);

  it('should have a version', () => assert(typeof recurly.version === 'string'));
  it('should be an event emitter', () => assert(recurly.on && recurly.emit));
  it('should be exposed as a window. singleton', () => {
    assert(window.recurly instanceof window.recurly.Recurly);
  });

  describe('Recurly.deviceId', () => {
    it('is a uuid', () => assert(isUuidv4(recurly.deviceId)));
    it('is set on localStorage', () => {
      assert.strictEqual(recurly.deviceId, localStorage.getItem('__recurly__.deviceId'));
    });
  });

  describe('Recurly.sessionId', () => {
    it('is a uuid', () => assert(isUuidv4(recurly.sessionId)));
    it('is set on sessionStorage', () => {
      assert.strictEqual(recurly.sessionId, sessionStorage.getItem('__recurly__.sessionId'));
    });
  });

  describe('Pricing factories', () => {
    it('has a CheckoutPricing factory at recurly.Pricing.Checkout', function () {
      assert(recurly.Pricing.Checkout() instanceof CheckoutPricing);
    });

    it('has a SubscriptionPricing factory at recurly.Pricing.Subscription', function () {
      assert(recurly.Pricing.Subscription() instanceof SubscriptionPricing);
    });

    it('has a SubscriptionPricing factory at recurly.Pricing', function () {
      assert(recurly.Pricing() instanceof SubscriptionPricing);
    });
  });
});
