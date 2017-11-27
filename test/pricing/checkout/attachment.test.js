import assert from 'assert';
import {applyFixtures} from '../../support/fixtures';
import {initRecurly} from '../../support/helpers';
import CheckoutPricingAttachment from '../../../lib/recurly/pricing/checkout/attachment'

const container = () => global.document.querySelector('#test-pricing');

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
      assert(attachment.container === container())
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
          assert(typeof this.pricing.items.shipping_address === 'undefined');
          this.pricing.on('set.address', () => {
            assert.equal(this.pricing.items.address.country, 'US');
            assert.equal(this.pricing.items.address.postal_code, '94129');
            assert.equal(this.pricing.items.shipping_address, undefined);
            done();
          });
        });
      })
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

    // describe('when given multiple subscriptions and adjustments', () => {
    //   this.ctx.fixture = 'checkoutPricing';
    //   this.ctx.fixtureOpts = {
    //     plan: 'basic',
    //     giftcard: 'super-gift-card'
    //   };
    // });
  });
});
