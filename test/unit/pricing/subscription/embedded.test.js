import assert from 'assert';
import SubscriptionPricing from '../../../../lib/recurly/pricing/subscription';
import EmbeddedSubscriptionPricing, {
  DISABLED_METHODS,
  DEFERRED_METHODS
} from '../../../../lib/recurly/pricing/subscription/embedded';
import { initRecurly } from '../../support/helpers';

describe('EmbeddedSubscriptionPricing', () => {
  beforeEach(function () {
    this.recurly = initRecurly();
    this.subscriptionPricingDefault = this.recurly.Pricing.Subscription();
    this.subscriptionPricing = this.recurly.Pricing.Subscription();

    // Spies
    this.originalMethods = {};
    DISABLED_METHODS.forEach(method => {
      sinon.stub(this.subscriptionPricing, method);
      this.originalMethods[method] = this.subscriptionPricing[method];
    });

    this.embeddedSubscriptionPricing = new EmbeddedSubscriptionPricing(this.subscriptionPricing);
  });

  describe('disabling methods', () => {
    it('Disables methods on the SubscriptionPricing instance', function () {
      DISABLED_METHODS.forEach(method => {
        assert.equal(this.subscriptionPricingDefault[method], SubscriptionPricing.prototype[method]);
        assert.notEqual(this.subscriptionPricing[method], SubscriptionPricing.prototype[method]);

        // Calling the method does not invoke its original form
        this.subscriptionPricing[method]();
        assert(this.originalMethods[method].notCalled);
      });
    });

    it('proxies the disabled methods onto the EmbeddedSubscriptionPricing instance', function () {
      DISABLED_METHODS.forEach(method => {
        assert.equal(this.subscriptionPricingDefault[method].prototype, SubscriptionPricing.prototype[method].prototype);

        // Loose assertion that this is now a bound method
        assert.equal(typeof this.embeddedSubscriptionPricing[method], 'function');
        assert.equal(this.embeddedSubscriptionPricing[method].prototype, undefined);

        // Calling the method does invoke its original
        assert(this.originalMethods[method].notCalled);
        this.embeddedSubscriptionPricing[method]();
        assert(this.originalMethods[method].calledOnce);
      });
    });
  });

  describe('deferred methods', () => {
    it('calls the methods on the SubscriptionPricing instance', function () {
      DEFERRED_METHODS.forEach(method => {
        sinon.stub(this.subscriptionPricing, method);
        this.embeddedSubscriptionPricing[method](1);
        assert(this.subscriptionPricing[method].calledOnce);
        assert(this.subscriptionPricing[method].calledWith(1));
      });
    });
  });
});
