import assert from 'assert';
import {applyFixtures} from '../../support/fixtures';
import {initRecurly} from '../../support/helpers';
import PricingAttachment from '../../../lib/recurly/pricing/subscription/attachment'

describe('Recurly.Pricing.attach', function () {
  beforeEach(function (done) {
    this.recurly = initRecurly();
    this.recurly.ready(done);
    this.pricing = this.recurly.Pricing();
  });

  applyFixtures();

  const container = () => window.document.querySelector('#test-pricing');

  describe('when no container is given', function () {
    it('throws an error', function () {
      assert.throws(() => this.pricing.attach(null), Error, 'invalid dom element');
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
      assert(attachment instanceof PricingAttachment);
      assert(attachment.container === container())
    });

    describe('when pre-populated with a valid coupon code', function () {
      this.ctx.fixtureOpts = { plan: 'basic', coupon: 'coop' };

      it('applies the coupon to the pricing instance', function (done) {
        assert(typeof this.pricing.items.coupon === 'undefined');
        this.pricing.on('set.coupon', () => {
          assert(this.pricing.items.coupon.code === 'coop');
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
        assert(typeof this.pricing.items.shipping_address === 'undefined');
        this.pricing.on('set.shipping_address', () => {
          assert.equal(this.pricing.items.shipping_address.country, 'US');
          assert.equal(this.pricing.items.shipping_address.postal_code, '94129');
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

    describe('when pre-populated with a valid gift card redemption code', function () {
      this.ctx.fixtureOpts = {
        plan: 'basic',
        giftcard: 'super-gift-card'
      };

      it('applies the giftcard to the pricing instance', function (done) {
        assert(typeof this.pricing.items.gift_card === 'undefined');
        this.pricing.on('set.gift_card', () => {
          assert(this.pricing.items.gift_card.currency === 'USD');
          assert(this.pricing.items.gift_card.unit_amount === 20);
          done();
        });
      });
    });

    describe('when tax amounts are set', function () {
      describe('when tax amounts are blank', function () {
        this.ctx.fixtureOpts = {
          plan: 'basic',
          'tax_amount.now': '',
          'tax_amount.next': ''
        };

        it('set the amounts to zero', function (done) {
          this.pricing.on('set.tax', () => {
            assert.strictEqual(this.pricing.items.tax.amount.now, 0);
            assert.strictEqual(this.pricing.items.tax.amount.next, 0);
            done();
          });
        });
      });

      describe('when only setting tax_amount.now', function () {
        this.ctx.fixtureOpts = {
          plan: 'basic',
          'tax_amount.now': '20'
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
          plan: 'basic',
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
            assert.strictEqual(container().querySelector('[data-recurly=tax_now]').innerHTML, '20.00');
            assert.strictEqual(container().querySelector('[data-recurly=tax_next]').innerHTML, '10.00');
            done();
          });
        });
      });
    });
  });
});
