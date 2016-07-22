import assert from 'assert';
import {applyFixtures} from '../support/fixtures';
import {initRecurly} from '../support/helpers';
import PricingAttachment from '../../lib/recurly/pricing/attachment'

const container = () => global.document.querySelector('#test-pricing');

describe('Recurly.Pricing.attach', function () {
  beforeEach(function (done) {
    this.recurly = initRecurly();
    this.recurly.ready(done);
    this.pricing = this.recurly.Pricing();
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
  });
});
