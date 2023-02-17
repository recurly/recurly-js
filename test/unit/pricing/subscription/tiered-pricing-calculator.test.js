import assert from 'assert';
import {
  getTieredPricingTotal,
  getTieredPricingUnitAmount
} from '../../../../lib/recurly/pricing/subscription/tiered-pricing-calculator';
import { initRecurly } from '../../support/helpers';
import TIERED_PLAN from '../../../server/fixtures/plans/tiered-plan.json';

describe('Recurly.Pricing.Subscription.TieredPricingCalculator', function () {
  beforeEach(function () {
    this.recurly = initRecurly();
    this.pricing = this.recurly.Pricing.Subscription();
  });
  describe('with tiered addons', () => {
    it('should apply the tiered cost to the addon price', function (done) {
      const tieredAddon = TIERED_PLAN.addons.filter((addon) => { return addon.code === 'tiered'; })[0];
      assert.strictEqual(getTieredPricingTotal(tieredAddon, 1, 'USD'), 2.00);
      assert.strictEqual(getTieredPricingTotal(tieredAddon, 2, 'USD'), 4.00);
      assert.strictEqual(getTieredPricingTotal(tieredAddon, 6, 'USD'), 14.00);
      done();
    });
    it('should apply the stairstep cost to the addon price', function (done) {
      const stairstepAddon = TIERED_PLAN.addons.filter((addon) => { return addon.code === 'stairstep'; })[0];
      assert.strictEqual(getTieredPricingTotal(stairstepAddon, 1, 'USD'), 2.00);
      assert.strictEqual(getTieredPricingTotal(stairstepAddon, 2, 'USD'), 2.00);
      assert.strictEqual(getTieredPricingTotal(stairstepAddon, 6, 'USD'), 4.00);
      done();
    });
    it('should apply the volume cost to the addon price', function (done) {
      const volumeAddon = TIERED_PLAN.addons.filter((addon) => { return addon.code === 'volume'; })[0];
      assert.strictEqual(getTieredPricingTotal(volumeAddon, 1, 'USD'), 2.00);
      assert.strictEqual(getTieredPricingTotal(volumeAddon, 2, 'USD'), 4.00);
      assert.strictEqual(getTieredPricingTotal(volumeAddon, 6, 'USD'), 24.00);
      done();
    });

    describe('unit pricing for current unit amount', () => {
      it('should return the current tier price for tiered pricing', function (done) {
        const tieredAddon = TIERED_PLAN.addons.filter((addon) => { return addon.code === 'tiered'; })[0];

        assert.strictEqual(getTieredPricingUnitAmount(tieredAddon, 1, 'USD'), 2.00);
        assert.strictEqual(getTieredPricingUnitAmount(tieredAddon, 2, 'USD'), 2.00);
        assert.strictEqual(getTieredPricingUnitAmount(tieredAddon, 5, 'USD'), 2.00);
        assert.strictEqual(getTieredPricingUnitAmount(tieredAddon, 6, 'USD'), 4.00);
        assert.strictEqual(getTieredPricingUnitAmount(tieredAddon, 50, 'USD'), 4.00);
        done();
      });

      it('should return the current tier price for stairstep pricing', function (done) {
        const tieredAddon = TIERED_PLAN.addons.filter((addon) => { return addon.code === 'stairstep'; })[0];

        assert.strictEqual(getTieredPricingUnitAmount(tieredAddon, 1, 'USD'), 2.00);
        assert.strictEqual(getTieredPricingUnitAmount(tieredAddon, 2, 'USD'), 2.00);
        assert.strictEqual(getTieredPricingUnitAmount(tieredAddon, 5, 'USD'), 2.00);
        assert.strictEqual(getTieredPricingUnitAmount(tieredAddon, 6, 'USD'), 4.00);
        assert.strictEqual(getTieredPricingUnitAmount(tieredAddon, 50, 'USD'), 4.00);
        done();
      });
    });
  });
});
