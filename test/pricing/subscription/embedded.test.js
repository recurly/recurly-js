import assert from 'assert';
import SubscriptionPricing from '../../../lib/recurly/pricing/subscription';
import EmbeddedSubscriptionPricing, {DISABLED_METHODS, DEFERRED_METHODS} from '../../../lib/recurly/pricing/subscription/embedded';
import {initRecurly} from '../../support/helpers';

describe('EmbeddedSubscriptionPricing', () => {
  beforeEach(function () {
    this.recurly = initRecurly();
    this.subscriptionPricingDefault = this.recurly.Pricing.Subscription();
    this.subscriptionPricing = this.recurly.Pricing.Subscription();
    this.embeddedSubscriptionPricing = new EmbeddedSubscriptionPricing(this.subscriptionPricing);
  });

  describe('disabling methods', () => {
    it('Disables methods on the SubscriptionPricing instance', function () {
      DISABLED_METHODS.forEach(method => {
        assert.equal(this.subscriptionPricingDefault[method], SubscriptionPricing.prototype[method]);
        assert.notEqual(this.subscriptionPricing[method], SubscriptionPricing.prototype[method]);
      });
    });

    it('proxies the disabled methods onto the EmbeddedSubscriptionPricing instance', function () {
      DISABLED_METHODS.forEach(method => {
        assert.equal(this.embeddedSubscriptionPricing[method].name, SubscriptionPricing.prototype[method].name);
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
