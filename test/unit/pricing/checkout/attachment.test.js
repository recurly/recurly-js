import assert from 'assert';
import { applyFixtures } from '../../support/fixtures';
import { initRecurly } from '../../support/helpers';
import CheckoutPricingAttachment from '../../../../lib/recurly/pricing/checkout/attachment';

const container = () => window.document.querySelector('#test-pricing');

describe('CheckoutPricing#attach', function () {
  beforeEach(function (done) {
    this.recurly = initRecurly();
    this.recurly.ready(done);
    this.pricing = this.recurly.Pricing.Checkout();
  });

  applyFixtures();

  describe('when no container is given', function () {
    it('throws an error', function () {
      assert.throws(() => this.pricing.attach(container()), Error, 'invalid dom element');
    });
  });

  describe('when given a container', function () {
    this.ctx.fixture = 'pricing';
    this.ctx.fixtureOpts = { plan: 'basic' };

    beforeEach(function () {
      assert(typeof this.pricing.attachment === 'undefined');
      this.pricing.attach(container());
    });

    it('attaches to the given container', function () {
      const attachment = this.pricing.attachment;
      assert(attachment instanceof CheckoutPricingAttachment);
      assert(attachment.container === container());
    });

    describe('when pre-populated with a valid coupon code', function () {
      this.ctx.fixtureOpts = { plan: 'basic', coupon: 'coop' };

      it('applies the coupon to the pricing instance', function (done) {
        assert(typeof this.pricing.items.coupon === 'undefined');
        this.pricing.on('set.coupon', () => {
          assert.equal(this.pricing.items.coupon.code, 'coop');
          done();
        });
      });
    });

    describe('when given an address', function () {
      this.ctx.fixtureOpts = {
        plan: 'basic',
        country: 'US',
        postal_code: '94129'
      };

      it('sets the address', function (done) {
        assert(typeof this.pricing.items.address === 'undefined');
        this.pricing.on('set.address', () => {
          assert(this.pricing.items.address.country === 'US');
          assert(this.pricing.items.address.postal_code === '94129');
          done();
        });
      });
    });

    describe('when given a shipping address', function () {
      this.ctx.fixtureOpts = {
        plan: 'basic',
        'shipping_address.country': 'US',
        'shipping_address.postal_code': '94129'
      };

      it('sets the shipping address', function (done) {
        assert(typeof this.pricing.items.shippingAddress === 'undefined');
        this.pricing.on('set.shippingAddress', () => {
          assert.equal(this.pricing.items.shippingAddress.country, 'US');
          assert.equal(this.pricing.items.shippingAddress.postal_code, '94129');
          done();
        });
      });

      describe('when shipping address is blank and billing address is present', function () {
        this.ctx.fixtureOpts = {
          plan: 'basic',
          country: 'US',
          postal_code: '94129',
          'shipping_address.country': '',
          'shipping_address.postal_code': ''
        };

        it('does not set the shipping address', function (done) {
          assert(typeof this.pricing.items.shippingAddress === 'undefined');
          this.pricing.on('set.address', () => {
            assert.equal(this.pricing.items.address.country, 'US');
            assert.equal(this.pricing.items.address.postal_code, '94129');
            assert.equal(this.pricing.items.shippingAddress, undefined);
            done();
          });
        });
      });
    });

    describe('when pre-populated with a valid giftcard redemption code', function () {
      this.ctx.fixtureOpts = {
        plan: 'basic',
        giftcard: 'super-gift-card'
      };

      it('applies the giftcard to the pricing instance', function (done) {
        assert(typeof this.pricing.items.giftCard === 'undefined');
        this.pricing.on('set.giftCard', () => {
          assert(this.pricing.items.giftCard.currency === 'USD');
          assert(this.pricing.items.giftCard.unit_amount === 20);
          done();
        });
      });
    });
  });

  describe('when given multiple subscriptions and adjustments', function () {
    this.ctx.fixture = 'checkoutPricing';
    this.ctx.fixtureOpts = {
      sub_0_plan: 'basic',
      sub_1_plan: 'basic-2',
      adj_0: '1',
      adj_1: '3',
      giftcard: 'super-gift-card'
    };

    beforeEach(function () {
      assert(typeof this.pricing.attachment === 'undefined');
      this.pricing.attach(container());
    });

    it('Applies the subscriptions and adjustments accordingly', function (done) {
      this.pricing.on('attached', () => {
        assert.equal(this.pricing.items.subscriptions.length, 2);
        assert.equal(this.pricing.validSubscriptions.length, 2);

        assert.equal(this.pricing.items.adjustments.length, 2);
        assert.equal(this.pricing.validAdjustments.length, 2);

        assert.equal(this.pricing.items.giftCard.currency, 'USD');
        assert.equal(this.pricing.items.giftCard.unit_amount, 20);

        assert.equal(this.pricing.price.now.total, '167.08');
        assert.equal(this.pricing.price.next.total, '110.08');
        assert.equal(this.pricing.price.now.subtotal, '187.08');
        assert.equal(this.pricing.price.next.subtotal, '110.08');
        assert.equal(this.pricing.price.now.adjustments, '70.00');
        assert.equal(this.pricing.price.next.adjustments, '0.00');
        assert.equal(this.pricing.price.now.subscriptions, '117.08');
        assert.equal(this.pricing.price.next.subscriptions, '110.08');
        assert.equal(this.pricing.price.now.giftCard, '20.00');
        assert.equal(this.pricing.price.next.giftCard, '0.00');
        assert.equal(this.pricing.price.now.taxes, '0.00');
        assert.equal(this.pricing.price.next.taxes, '0.00');
        assert.equal(container().querySelector('[data-recurly="currency_code"]').innerHTML, 'USD');
        assert.equal(container().querySelector('[data-recurly="currency_symbol"]').innerHTML, '$');
        assert.equal(container().querySelector('[data-recurly="total_now"]').innerHTML, this.pricing.price.now.total);
        assert.equal(container().querySelector('[data-recurly="total_next"]').innerHTML, this.pricing.price.next.total);
        assert.equal(container().querySelector('[data-recurly="subtotal_now"]').innerHTML, this.pricing.price.now.subtotal);
        assert.equal(container().querySelector('[data-recurly="subtotal_next"]').innerHTML, this.pricing.price.next.subtotal);
        assert.equal(container().querySelector('[data-recurly="subscriptions_now"]').innerHTML, this.pricing.price.now.subscriptions);
        assert.equal(container().querySelector('[data-recurly="subscriptions_next"]').innerHTML, this.pricing.price.next.subscriptions);
        assert.equal(container().querySelector('[data-recurly="adjustments_now"]').innerHTML, this.pricing.price.now.adjustments);
        assert.equal(container().querySelector('[data-recurly="adjustments_next"]').innerHTML, this.pricing.price.next.adjustments);
        assert.equal(container().querySelector('[data-recurly="taxes_now"]').innerHTML, this.pricing.price.now.taxes);
        assert.equal(container().querySelector('[data-recurly="taxes_next"]').innerHTML, this.pricing.price.next.taxes);
        done();
      });
    });

    describe('when tax amounts are set', function () {
      describe('when tax amounts are blank', function () {
        this.ctx.fixtureOpts = {
          sub_0_plan: 'basic',
          sub_1_plan: 'basic-2',
          adj_0: '1',
          adj_1: '3',
          'tax_amount.now': '',
          'tax_amount.next': ''
        };

        it('set the amounts to zero', function (done) {
          this.pricing.on('set.tax', () => {
            container();
            assert.strictEqual(this.pricing.items.tax.amount.now, 0);
            assert.strictEqual(this.pricing.items.tax.amount.next, 0);
            done();
          });
        });
      });

      describe('when only setting tax_amount.now', function () {
        this.ctx.fixtureOpts = {
          sub_0_plan: 'basic',
          sub_1_plan: 'basic-2',
          adj_0: '1',
          adj_1: '3',
          'tax_amount.now': '20',
        };

        it('sets the `tax_amount.now` and defaults the `tax_amount.next` to zero', function (done) {
          this.pricing.on('set.tax', () => {
            assert.strictEqual(this.pricing.items.tax.amount.now, '20');
            assert.strictEqual(this.pricing.items.tax.amount.next, 0);
            done();
          });
        });
      });

      describe('when setting both tax amounts', function () {
        this.ctx.fixtureOpts = {
          sub_0_plan: 'basic',
          sub_1_plan: 'basic-2',
          adj_0: '1',
          adj_1: '3',
          'tax_amount.now': '20',
          'tax_amount.next': '10'
        };

        it('sets both values', function (done) {
          this.pricing.on('set.tax', () => {
            assert.strictEqual(this.pricing.items.tax.amount.now, '20');
            assert.strictEqual(this.pricing.items.tax.amount.next, '10');
            done();
          });
        });

        it('outputs the tax amounts exactly as given', function (done) {
          this.pricing.on('change', () => {
            // HACK: await application of taxes
            if (!this.pricing.items.tax) return;
            assert.strictEqual(container().querySelector('[data-recurly=taxes_now]').innerHTML, '20.00');
            assert.strictEqual(container().querySelector('[data-recurly=taxes_next]').innerHTML, '10.00');
            done();
          });
        });
      });
    });
  });
});
