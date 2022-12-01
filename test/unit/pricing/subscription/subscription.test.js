import assert from 'assert';
import { initRecurly } from '../../support/helpers';

describe('Recurly.Pricing.Subscription', function () {
  beforeEach(function () {
    this.recurly = initRecurly();
    this.pricing = this.recurly.Pricing.Subscription();
  });

  describe('with taxation', () => {
    it('should not append tax elements if there is no tax', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .done(function (price) {
          assert.equal(price.taxes.length, 0);
          assert.equal(price.now.tax, '0.00');
          assert.equal(price.next.tax, '0.00');
          done();
        });
    });

    it('should not apply tax if plan is tax exempt and not usst', function (done) {
      this.pricing
        .plan('tax_exempt', { quantity: 1 })
        .address({
          country: 'GB'
        })
        .done(function (price) {
          assert.equal(price.taxes.length, 0);
          assert.equal(price.now.tax, '0.00');
          assert.equal(price.next.tax, '0.00');
          done();
        });
    });

    it('should apply a giftcard discount to the post tax price', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: '94110' // tax literal for test
        })
        .giftcard("hundred-dollar-card")
        .done(function (price) {
          assert.equal(price.now.gift_card, '23.91');
          assert.equal(price.next.gift_card, '21.74');
          assert.equal(price.now.total, '0.00');
          assert.equal(price.next.total, '0.00');
          done();
        });
    });

    it('should append US tax elements in the US', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: '94110' // tax literal for test
        })
        .done(function (price) {
          assert.equal(price.taxes.length, 1);
          assert.equal(price.taxes[0].type, 'us');
          assert.equal(price.taxes[0].rate, '0.0875');
          assert.equal(price.now.tax, '1.92');
          assert.equal(price.next.tax, '1.75');
          done();
        });
    });

    it('should append VAT tax elements if in the EU', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'DE'
        })
        .done(function (price) {
          assert.equal(price.taxes.length, 1);
          assert.equal(price.taxes[0].type, 'vat');
          assert.equal(price.taxes[0].rate, '0.015');
          assert.equal(price.now.tax, '0.33');
          assert.equal(price.next.tax, '0.30');
          done();
        });
    });

    it('should append US state tax, similar to 2015 VAT regulations', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: '94129' // tax literal for test
        })
        .done(function (price) {
          assert.equal(price.taxes.length, 1);
          assert.equal(price.taxes[0].type, 'us');
          assert.equal(price.taxes[0].rate, '0.0875');
          assert.equal(price.taxes[0].region, 'CA');
          assert.equal(price.now.tax, '1.92');
          assert.equal(price.next.tax, '1.75');
          done();
        });
    });

    it('should append VAT tax elements if in the EU and region for 2015 type rules', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'GB'
        })
        .done(function (price) {
          assert.equal(price.taxes.length, 1);
          assert.equal(price.taxes[0].type, 'vat');
          assert.equal(price.taxes[0].region, 'GB');
          assert.equal(price.taxes[0].rate, '0.2');
          assert.equal(price.now.tax, '4.40');
          assert.equal(price.next.tax, '4.00');
          done();
        });
    });

    it('should append 20 pct. of 49.00 to have a correct tax of $9.80', function (done) {
      this.pricing
        .plan('free-trial', { quantity: 1 })
        .address({
          country: 'GB'
        })
        .done(function (price) {
          assert.equal(price.taxes.length, 1);
          assert.equal(price.taxes[0].type, 'vat');
          assert.equal(price.taxes[0].region, 'GB');
          assert.equal(price.taxes[0].rate, '0.2');
          assert.equal(price.now.tax, '0.40');
          assert.equal(price.next.tax, '9.80');
          done();
        });
    });

    describe('with a shipping address', function () {
      it('calculates tax from the shipping address', function (done) {
        this.pricing
          .plan('basic', { quantity: 1 })
          .shippingAddress({
            country: 'US',
            postal_code: '94129'
          })
          .done(function (price) {
            assert.equal(price.taxes.length, 1);
            assert.equal(price.taxes[0].type, 'us');
            assert.equal(price.taxes[0].rate, '0.0875');
            assert.equal(price.now.tax, '1.92');
            assert.equal(price.next.tax, '1.75');
            done();
          });
      });

      it('calculates tax from the shipping address when a billing address is given', function (done) {
        this.pricing
          .plan('basic', { quantity: 1 })
          .address({
            country: 'DE',
            postal_code: 'XXX-XXX'
          })
          .shippingAddress({
            country: 'US',
            postal_code: '94129'
          })
          .done(function (price) {
            assert.equal(price.taxes.length, 1);
            assert.equal(price.taxes[0].type, 'us');
            assert.equal(price.taxes[0].rate, '0.0875');
            assert.equal(price.now.tax, '1.92');
            assert.equal(price.next.tax, '1.75');
            done();
          });
      })
    });

    describe('given specific tax amounts', () => {
      it('requires the now and next amounts be given as finite numbers', function () {
        assert.throws(() => this.pricing.tax({ amount: 'invalid' }), /Invalid 'amount'/);
        assert.throws(() => this.pricing.tax({ amount: { now: 'invalid' } }), /Invalid 'amount.now'/);
        assert.throws(() => this.pricing.tax({ amount: { now: 20 } }), /Invalid 'amount.next'/);
        assert.throws(() => this.pricing.tax({ amount: { now: 20, next: 'invalid' } }), /Invalid 'amount.next'/);
      });

      it('applies the specific tax amounts as provided, ignoring built-in tax calculations', function (done) {
        this.pricing
          .plan('basic', { quantity: 1 })
          .address({
            country: 'US',
            postal_code: '94129'
          })
          .tax({
            amount: {
              now: 20,
              next: 10
            }
          })
          .done(price => {
            assert.strictEqual(this.pricing.items.tax.amount.now, 20);
            assert.strictEqual(this.pricing.items.tax.amount.next, 10);
            assert.strictEqual(price.now.tax, '20.00');
            assert.strictEqual(price.next.tax, '10.00');
            done();
          });
      });
    });
  });

  describe('with addons', () => {
    describe('with fixed addons', () => {
      it('updates the price accordingly', function (done) {
        this.pricing
          .plan('basic', { quantity: 1 })
          .addon('snarf')
          .done(price => {
            assert.equal(price.now.addons, '1.00');
            assert.equal(price.next.addons, '1.00');
            assert.equal(price.now.total, '22.99');
            assert.equal(price.next.total, '20.99');
            done();
          });
      });

      describe('when an addon quantity is updated', () => {
        it('updates the quantity and price accordingly', function (done) {
          this.pricing
            .plan('basic', { quantity: 1 })
            .addon('snarf', { quantity: 1 })
            .then(() => {
              assert.equal(this.pricing.items.addons.length, 1);
              assert.equal(this.pricing.items.addons[0].code, 'snarf');
              assert.equal(this.pricing.items.addons[0].quantity, 1);
            })
            .addon('snarf', { quantity: 2 })
            .done(price => {
              assert.equal(this.pricing.items.addons.length, 1);
              assert.equal(this.pricing.items.addons[0].code, 'snarf');
              assert.equal(this.pricing.items.addons[0].quantity, 2);
              assert.equal(price.now.addons, '2.00');
              assert.equal(price.next.addons, '2.00');
              assert.equal(price.now.total, '23.99');
              assert.equal(price.next.total, '21.99');
              done();
            });
        });
      });

      describe('when an addon quantity is updated to zero', () => {
        it('removes the addon from the pricing instance', function (done) {
          this.pricing
            .plan('basic', { quantity: 1 })
            .addon('snarf', { quantity: 2 })
            .then(() => {
              assert.equal(this.pricing.items.addons.length, 1);
              assert.equal(this.pricing.items.addons[0].code, 'snarf');
              assert.equal(this.pricing.items.addons[0].quantity, 2);
            })
            .addon('snarf', { quantity: 0 })
            .done(price => {
              assert.equal(this.pricing.items.addons.length, 0);
              assert.equal(price.now.addons, '0.00');
              assert.equal(price.next.addons, '0.00');
              assert.equal(price.now.total, '21.99');
              assert.equal(price.next.total, '19.99');
              done();
            });
        });
      });
    });

    describe('with usage addons', () => {
      it('should not apply the usage cost to the price', function (done) {
        this.pricing
          .plan('basic', { quantity: 1 })
          .addon('snarf')
          .addon('with_usage')
          .done(function (price) {
            assert.equal(price.now.addons, '1.00');
            assert.equal(price.next.addons, '1.00');
            assert.equal(price.now.total, '22.99');
            assert.equal(price.next.total, '20.99');
            done();
          });
      });
    });

    describe('with tiered addons', () => {
      it('should apply the tiered cost to the addon price', function (done) {
        this.pricing
          .plan('tiered-addons', { quantity: 1 })
          .addon('tiered')
          .then(() => {
            assert.equal(this.pricing.items.addons.length, 1);
            assert.equal(this.pricing.items.addons[0].code, 'tiered');
            assert.equal(this.pricing.items.addons[0].quantity, 1);
          })
          .addon('tiered', { quantity: 5 })
          .done(price => {
            assert.equal(this.pricing.items.addons.length, 1);
            assert.equal(this.pricing.items.addons[0].code, 'tiered');
            assert.equal(this.pricing.items.addons[0].quantity, 5);
            // 3 * 2 + 2 * 4 = 14
            assert.equal(price.now.addons, '14.00');
            assert.equal(price.next.addons, '14.00');
            assert.equal(price.now.total, '35.99');
            assert.equal(price.next.total, '33.99');
            done();
          });
      });
    });
  });

  describe('with gift cards', function () {
    it('should apply a valid gift card correctly to price.now', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US'
        })
        .giftcard("super-gift-card")
        .done(function (price) {
          assert.equal(price.now.total, '1.99');
          assert.equal(price.next.total, '19.99');
          done();
        });
    });

    it('should return the value of gift card used in price.now and price.next', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US'
        })
        .giftcard("super-gift-card")
        .done(function (price) {
          assert.equal(price.now.gift_card, '20.00');
          assert.equal(price.next.gift_card, '0.00');
          done();
        });
    });

    it('should use leftover gift card balance in price.next', function (done) {
      this.pricing
        .plan('basic', { quantity: 4 })
        .address({
          country: 'US'
        })
        .giftcard("hundred-dollar-card")
        .done(function (price) {
          assert.equal(price.now.gift_card, '81.96');
          assert.equal(price.next.gift_card, '18.04');
          assert.equal(price.now.total, '0.00');
          assert.equal(price.next.total, '61.92');
          done();
        });
    });

    it('should never set a total lower than 0.00', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US'
        })
        .giftcard("hundred-dollar-card")
        .done(function (price) {
          assert.equal(price.now.gift_card, '21.99');
          assert.equal(price.next.gift_card, '19.99');
          assert.equal(price.now.total, '0.00');
          assert.equal(price.next.total, '0.00');
          done();
        });
    });

    it('emits an error event when a gift card is not found', function (done) {
      this.pricing
        .on('error.gift_card', function (err) {
          assert(err.code === 'not-found');
          done();
        })
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US'
        })
        .giftcard('invalid');
    });

    it('emits an event when the gift card is set', function (done) {
      this.pricing
        .on('set.gift_card', function (giftcard) {
          assert(giftcard.currency === 'USD');
          assert(giftcard.unit_amount === 20);
          done();
        })
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US'
        })
        .giftcard('super-gift-card');
    });

    it('emits an event when the gift card is unset', function (done) {
      this.pricing
        .on('unset.gift_card', function () {
          done();
        })
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US'
        })
        .giftcard('australian-card');
    });

    it('emits an error event when the giftcard currency doesnt match the config currency', function (done) {
      this.pricing
        .on('error.gift_card', function (err) {
          assert(err.code === 'gift-card-currency-mismatch');
          done();
        })
        .plan('basic', { quantity: 1 })
        .address({
          country: 'AUD' // I set AUD here because it's the config currency not address currency that matters. config currency is USD.
        })
        .giftcard('australian-card');
    });

    it('emits an unset event when a giftcard is cleared and removes giftcard from the pricing', function (done) {
      let emitted = false;
      this.pricing
        .on('unset.gift_card', () => emitted = true)
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .giftcard('super-gift-card')
        .then((giftcard) => assert(giftcard.unit_amount === 20))
        .giftcard('')
        .then((giftcard) => assert(!giftcard))
        .done(function (price) {
          assert.equal(price.now.gift_card, undefined);
          assert.equal(price.now.total,"21.99");
          assert(emitted, true);
          done();
        });
    });
  });

  describe('with coupons', function () {
    it('should apply a multi-use coupon correctly', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop')
        .done(function (price) {
          assert.equal(price.now.discount, '20.00');
          assert.equal(price.next.discount, '19.99');
          done();
        });
    });

    it('should apply a single-use coupon correctly', function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop-single-use')
        .done(function (price) {
          assert.equal(price.now.discount, '20.00');
          assert.equal(price.next.discount, '0.00');
          done();
        });
    });

    it('should apply a trial extension coupon to a plan with a trial period', function (done) {
      this.pricing
        .plan('free-trial', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop-free-trial')
        .done(function (price) {
          assert.equal(price.now.plan, '0.00');
          assert.equal(price.now.addons, '0.00');
          assert.equal(price.now.discount, '0.00');
          assert.equal(price.next.discount, '0.00');
          done();
        });
    });

    it(`should apply a trial period when a trial extension coupon
        is applied to a plan without a trial period`, function (done) {
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop-free-trial')
        .done(function (price) {
          assert.equal(price.now.plan, '0.00');
          assert.equal(price.now.addons, '0.00');
          assert.equal(price.now.discount, '0.00');
          assert.equal(price.next.discount, '0.00');
          done();
        });
    });

    it('emits an error event when a coupon is not found', function (done) {
      this.pricing
        .on('error.coupon', function (err) {
          assert(err.code === 'not-found');
          done();
        })
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop-invalid');
    });

    it('emits an unset event when a coupon is cleared', function (done) {
      let emitted = false;
      this.pricing
        .on('unset.coupon', () => emitted = true)
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop')
        .then((coupon) => assert(coupon.code === 'coop'))
        .coupon('')
        .then((coupon) => assert(!coupon))
        .done(function (price) {
          assert.equal(price.now.discount, '0.00');
          assert(emitted, true);
          done();
        });
    });

    it('does nothing when the same coupon is set again', function (done) {
      const fail = event => {
        assert.fail(`${event} emitted`, `${event} should not be emitted`);
      };
      this.pricing
        .plan('basic', { quantity: 1 })
        .address({
          country: 'US',
          postal_code: 'NoTax'
        })
        .coupon('coop')
        .then(() => {
          this.pricing.on('error.coupon', () => fail('error.coupon'));
          this.pricing.on('set.coupon', () => fail('set.coupon'));
          this.pricing.on('unset.coupon', () => fail('unset.coupon'));
        })
        .coupon('coop')
        .then(coupon => {
          assert.equal(coupon.code, 'coop');
          assert.equal(this.pricing.items.coupon.code, 'coop');
          done();
        })
        .done();
    });

    describe('when the plan has a free trial period with a set-up fee', () => {
      it('applies single-use discounts to the setup fee', function () {
        return this.pricing
          .plan('free-trial')
          .coupon('coop-single-use')
          .reprice()
          .then(price => {
            assert.strictEqual(price.now.discount, '2.00');
            assert.strictEqual(price.next.discount, '0.00');
            assert.strictEqual(price.now.total, '0.00');
            assert.strictEqual(price.next.total, '49.00');
          });
      });
    });

    describe('when the plan has a free trial period and no set-up fee', () => {
      it('applies single-use discounts to the price next period', function () {
        return this.pricing
          .plan('free-trial-no-setup')
          .coupon('coop-single-use')
          .reprice()
          .then(price => {
            assert.strictEqual(price.now.discount, '0.00');
            assert.strictEqual(price.next.discount, '20.00');
            assert.strictEqual(price.now.total, '0.00');
            assert.strictEqual(price.next.total, '29.00');
          });
      });
    });

    describe('when the plan is changed', () => {
      it('removes coupons which are incompatible with the new plan', function (done) {
        this.pricing
          .plan('basic', { quantity: 1 })
          .coupon('coop-pct-plan-basic')
          .then(coupon => {
            assert.equal(coupon.code, 'coop-pct-plan-basic');
            assert.equal(this.pricing.items.coupon.code, 'coop-pct-plan-basic');
          })
          .reprice()
          .then(price => {
            assert.equal(price.now.discount, '3.00');
            assert.equal(price.next.discount, '3.00');
            assert.equal(price.now.total, '18.99');
            assert.equal(price.next.total, '16.99');
          })
          .plan('basic-2', { quantity: 1 })
          .done(price => {
            assert.equal(this.pricing.items.coupon, undefined);
            assert.equal(price.now.discount, '0.00');
            assert.equal(price.next.discount, '0.00');
            assert.equal(price.now.total, '95.09');
            assert.equal(price.next.total, '90.09');
            done();
          });
      });
    });
  });
});
