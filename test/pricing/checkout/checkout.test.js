import assert from 'assert';
import after from 'lodash.after';
import isEqual from 'lodash.isequal';
import {initRecurly} from '../../support/helpers';

describe('CheckoutPricing', function () {
  beforeEach(function (done) {
    this.recurly = initRecurly();
    this.pricing = this.recurly.Pricing.Checkout();
    this.pricing.reprice(); // should not be necessary once reprice is updated

    subscriptionPricingFactory('multiple-currencies', this.recurly, sub => {
      this.subscriptionPricingExample = sub;
      done();
    });
  });

  /**
   * Subscriptions
   */

  describe('CheckoutPricing#subscription', () => {
    it('only accepts a SubscriptionPricing', function (done) {
      const part = after(2, done);
      this.pricing.subscription({ not: 'valid' }).catch(err => {
        assert.equal(err.code, 'invalid-option');
        assert.equal(err.name, 'subscription');
        assert(~err.message.indexOf('recurly.Pricing.Subscription'));
        part();
      });
      this.pricing.subscription(this.subscriptionPricingExample).done(() => part());
    });

    it('adds the subscription to price itemization and total', function (done) {
      const subscriptionTotalNow = this.subscriptionPricingExample.price.now.total;
      const subscriptionTotalNext = this.subscriptionPricingExample.price.next.total;
      assert.equal(this.pricing.price.now.items.length, 0);
      this.pricing
        .subscription(this.subscriptionPricingExample)
        .done(price => {
          assert.equal(this.pricing.price.now.items.length, 1);
          // TODO: This is not final. float parsing should not be necessary
          assert.equal(price.now.total, parseFloat(subscriptionTotalNow));
          assert.equal(price.next.total, parseFloat(subscriptionTotalNext));
          done();
        });
    });

    it('emits the set.subscription event', function (done) {
      this.pricing.on('set.subscription', sub => {
        assert.equal(sub, this.subscriptionPricingExample);
        done();
      });
      this.pricing.subscription(this.subscriptionPricingExample);
    });

    describe('currency resolution', () => {
      describe('when no subscriptions are present', () => {
        it('sets the checkout currency using the recurly instance currency', function () {
          assert.equal(this.pricing.price.currency.code, this.recurly.config.currency);
        });
      });

      describe('when a subscription is being added', () => {
        describe('when no subscriptions are present', () => {
          it('sets the checkout currency using the subscription currency', function (done) {
            assert.equal(this.pricing.price.currency.code, 'USD');
            this.subscriptionPricingExample
              .currency('EUR')
              .then(() => this.pricing.subscription(this.subscriptionPricingExample))
              .done(price => {
                assert.equal(price.currency.code, 'EUR');
                done();
              });
          });
        });

        describe('when subscriptions already exist', () => {
          beforeEach(function (done) {
            subscriptionPricingFactory('basic', this.recurly, sub => {
              this.subscriptionPricingExampleTwo = sub;
              done();
            });
          });

          it('sets the first common currency if one exists between all subscriptions', function (done) {
            assert.equal(this.pricing.items.subscriptions.length, 0);
            this.pricing
              .subscription(this.subscriptionPricingExample)
              .subscription(this.subscriptionPricingExampleTwo)
              .done(price => {
                assert.equal(this.pricing.items.subscriptions.length, 2);
                assert(isEqual(Object.keys(this.subscriptionPricingExample.items.plan.price), ['USD', 'EUR']));
                assert(isEqual(Object.keys(this.subscriptionPricingExampleTwo.items.plan.price), ['USD']));
                assert.equal(price.currency.code, 'USD');
                done();
              });
          });

          // TODO
          it('rejects a subscription if it does not support any existing subscription currencies');
        });
      });
    });
  });

  /**
   * Adjustments
   */

  describe('CheckoutPricing#adjustment', () => {
    it('accepts coercable finite numbers for amount, and stores a Number', function (done) {
      const examples = [3, '3', 3.21, '3.97', 9007199254740991, '9007199254740991'];
      const part = after(examples.length, done);

      examples.forEach((valid, i) => {
        this.pricing.adjustment({ amount: valid }).done(price => {
          assert.strictEqual(this.pricing.items.adjustments[i].amount, Number(valid));
          part();
        });
      });
    });

    it('rejects non-ceorcable finite numbers for amount', function (done) {
      const examples = ['invalid', { invalid: 'value' }, Infinity, NaN];
      const part = after(examples.length, done);

      examples.forEach(invalid => {
        this.pricing.adjustment({ amount: invalid }).catch(e => {
          assert.equal(e.code, 'invalid-option');
          assert.equal(e.name, 'amount');
          part();
        });
      });
    });

    it('has a default quantity of 1', function (done) {
      this.pricing.adjustment({ amount: 3.99 }).done(price => {
        assert.equal(this.pricing.items.adjustments[0].quantity, 1);
        done();
      });
    });

    it('coerces quantity to an integer', function (done) {
      const examples = ['3', 3, 3.77, '3.97'];
      const part = after(examples.length, done);

      examples.forEach((coerce, i) => {
        this.pricing.adjustment({ amount: 7, quantity: coerce }).done(e => {
          assert.equal(this.pricing.items.adjustments[i].quantity, 3);
          part();
        });
      });
    });

    it('coerces taxExempt to a boolean', function (done) {
      const examples = [['1', true], ['true', true], [true, true], ['', false], [false, false]];
      const part = after(examples.length, done);

      examples.forEach((example, i) => {
        this.pricing.adjustment({
          amount: 7,
          taxExempt: example[0]
        }).done(e => {
          assert.equal(this.pricing.items.adjustments[i].taxExempt, example[1]);
          part();
        });
      });
    });

    it('adds the adjustment to price itemization and total', function (done) {
      assert.equal(this.pricing.price.now.items.length, 0);
      this.pricing.adjustment({ amount: 6.99 }).done(price => {
        assert.equal(price.now.total, 6.99);
        assert.equal(price.now.items.length, 1);
        done();
      });
    });

    it('emits the set.adjustment event', function (done) {
      this.pricing.on('set.adjustment', adj => {
        assert.strictEqual(adj.amount, 7.59);
        done();
      });
      this.pricing.adjustment({ amount: 7.59 });
    });
  });

  /**
   * Coupons
   */

  describe('CheckoutPricing#coupon', () => {
    it('accepts a blank coupon code and does not assign a coupon', function (done) {
      this.pricing.coupon(null).done(price => {
        assert.equal(this.pricing.items.coupon, undefined);
        done();
      });
    });

    describe('when given an invalid coupon code', () => {
      const invalid = 'coop-invalid';
      it('does not assign a coupon', function (done) {
        this.pricing.coupon(invalid).done(price => {
          assert.equal(this.pricing.items.coupon, undefined);
          done();
        });
      });
    });

    describe('when given a valid coupon code', () => {
      const valid = 'coop';
      it('assigns the coupon and fires the set.coupon event', function (done) {
        this.pricing.on('set.coupon', coupon => {
          assert.equal(coupon.code, valid);
          done();
        });
        this.pricing.coupon('coop').done();
      });
    });

    describe('with a coupon already set', () => {
      beforeEach(function () {
        return this.pricing.coupon('coop').reprice();
      });

      it('accepts a blank coupon code and unsets the existing coupon, firing the unset.coupon event', function (done) {
        assert.equal(this.pricing.items.coupon.code, 'coop');
        this.pricing.on('unset.coupon', () => {
          assert.equal(this.pricing.items.coupon, undefined);
          done();
        });
        this.pricing.coupon(null).done();
      });
    });

    describe('Calculations', () => {
      describe('given a CheckoutPricing containing multiple subscriptions and adjustments', () => {
        beforeEach(function (done) {
          subscriptionPricingFactory('basic', this.recurly, sub => {
            this.subscriptionPricingExampleTwo = sub;
            done();
          });
        });

        beforeEach(function () {
          return this.pricing
            .subscription(this.subscriptionPricingExample)
            .subscription(this.subscriptionPricingExampleTwo)
            .adjustment({ amount: 10 })
            .adjustment({ amount: 22.44 })
            .reprice();
        });

        /**
         * Rate-based coupons
         */

        describe('given a rate coupon which', () => {
          describe('only applies to adjustments', () => {
            beforeEach(applyCoupon('coop-pct-adjustments'));
            it('discounts the adjustments only', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 4.87); // 15% of the adjustment total

              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
            });
          });

          describe('only applies to subscriptions', () => {
            beforeEach(applyCoupon('coop-pct-subscriptions'));
            it('discounts the subscriptions only', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 6.0); // 15% of the subscription total, less their setup fees ($4)
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 6.0);
            });
          });

          describe('applies to subscriptions and adjustments', () => {
            beforeEach(applyCoupon('coop-pct-all'));
            it('discounts the subscriptions and adjustments', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 10.86); // 15% of all items, sub setup fees excepted
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 6.0);
            });
          });

          describe('is single-use and applies to subscriptions and adjustments', () => {
            beforeEach(applyCoupon('coop-pct-all-single'));
            it('discounts only the subscriptions now, and applies no discounts next cycle', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 10.86); // 15% of all items, sub setup fees excepted
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
            });
          });

          describe('applies only to specific plans', () => {
            beforeEach(applyCoupon('coop-pct-plan-basic'));
            it('discounts only the subscriptions on compatible plans', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 3.0); // 15% off of the basic subscription
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 3.0);
            });
          });

          describe('applies to adjustments and specific plans', () => {
            beforeEach(applyCoupon('coop-pct-adjustments-plan-basic'));
            it('discounts the adjustments and subscriptions on compatible plans', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 7.86); // 15% off of the basic subscription + adjustments
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 3.0);
            });
          });

          describe('applies to adjustments and specific plans not on the CheckoutPricing instance', () => {
            beforeEach(applyCoupon('coop-pct-adjustments-plan-notbasic'));
            it('discounts only the adjustments', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 4.87); // 15% off adjustments
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
            });
          });

          describe('applies only to specific plans not on the CheckoutPricing instance', () => {
            beforeEach(applyCoupon('coop-pct-plan-notbasic'));
            it('does not discount', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 0);
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
            });
          });
        });

        /**
         * Fixed amount coupons
         */

        describe('given a fixed amount coupon which', () => {
          describe('applies to adjustments only and is less than the adjustments total', () => {
            beforeEach(applyCoupon('coop-fixed-adjustments-5'));
            it('discounts the coupon amount now, and not on the next cycle', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 5);
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
            });
          });

          describe('applies to adjustments only and is greater than the adjustments total', () => {
            beforeEach(applyCoupon('coop-fixed-adjustments-50'));
            it('discounts the adjustments only', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 32.44);
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
            });
          });

          describe('applies to subscriptions only and is less than the subscriptions total', () => {
            beforeEach(applyCoupon('coop-fixed-subscriptions-5'));
            it('discounts the coupon amount now and on the next cycle', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 5);
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 5);
            });
          });

          describe('applies to subscriptions only and is greater than the subscriptions total', () => {
            beforeEach(applyCoupon('coop-fixed-subscriptions-50'));
            it('discounts the subscriptions only', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 43.98);
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 39.98);
            });
          });

          describe('applies to adjustments and subscriptions, and is greater than the total charges', () => {
            beforeEach(applyCoupon('coop-fixed-all-500'));
            it('discounts the entire purchase now, and the subscriptions on the next cycle', function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 76.42);
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 39.98);
            });
          });

          describe('applies to adjustments and specific subscriptions on the checkout instance', () => {
            beforeEach(applyCoupon('coop-fixed-adjustments-plan-basic-500'));
            it(`discounts the adjustments and matching subscription now,
                and only the matching subscription on the next cycle`, function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 54.43); // 19.99 + 2 (setup fee) + 32.44
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 19.99);
            });
          });

          describe('applies to adjustments and specific subscriptions not on the checkout instance', () => {
            beforeEach(applyCoupon('coop-fixed-adjustments-plan-notbasic-500'));
            it(`discounts the adjustments now, and nothing on the next cycle`, function () {
              assert.equal(this.price.now.subscriptions, 43.98);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 32.44);
              assert.equal(this.price.next.subscriptions, 39.98);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
            });
          });
        });

        /**
         * Subscription-level coupons
         */

        describe('given a subscription-level coupon which', () => {
          beforeEach(function (done) {
            subscriptionPricingFactory('basic-2', this.recurly, sub => {
              this.subscriptionPricingExampleThree = sub;
              done();
            });
          });

          beforeEach(function () {
            return this.pricing
              .subscription(this.subscriptionPricingExampleThree)
              .reprice();
          });

          describe('is a fixed amount and applies to adjustments and subscriptions', () => {
            beforeEach(applyCoupon('coop-sub-level-fixed-all-500'));
            it(`discounts the adjustments and one subscription (including setup fee)
                now, and one subscription on the next cycle`, function () {
              assert.equal(this.price.now.subscriptions, 139.07);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 127.53); // 90.09 (basic-2) + 5 (setup fee) + 32.44
              assert.equal(this.price.next.subscriptions, 130.07);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 90.09);
            });
          });

          describe('is a rate discount and applies to adjustments and subscriptions', () => {
            beforeEach(applyCoupon('coop-sub-level-pct-all-500'));
            it(`discounts the adjustments and one subscription (excluding setup fee)
                now, and one subscription on the next cycle`, function () {
              assert.equal(this.price.now.subscriptions, 139.07);
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 18.38); // 15% of 90.09 (basic-2) + 32.44
              assert.equal(this.price.next.subscriptions, 130.07);
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 13.51); // 15% of 90.09
            });
          });
        });

        /**
         * Free trial coupons
         */

        describe('given a free trial coupon which', () => {
          beforeEach(function (done) {
            subscriptionPricingFactory('basic-2', this.recurly, sub => {
              this.subscriptionPricingExampleThree = sub;
              done();
            });
          });

          // Subscription with a free trial
          beforeEach(function (done) {
            subscriptionPricingFactory('intermediate', this.recurly, sub => {
              this.subscriptionPricingExampleFour = sub;
              done();
            });
          });

          beforeEach(function () {
            return this.pricing
              .subscription(this.subscriptionPricingExampleThree)
              .subscription(this.subscriptionPricingExampleFour)
              .reprice();
          });

          describe('applies to all plans on the account level', () => {
            beforeEach(applyCoupon('coop-free-trial-acct'));
            it(`applies the free trial to all subscriptions`, function () {
              debugger;
              assert.equal(this.price.now.subscriptions, 11); // setup fees
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 0);
              assert.equal(this.price.next.subscriptions, 179.07); // 19.99 * 2 + 90.09 + 49
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
              assert.equal(this.subscriptionPricingExampleThree.items.coupon.code, 'coop-free-trial-acct');
              assert.equal(this.subscriptionPricingExampleThree.price.now.total, 5); // setup fee
            });
          });

          describe('applies to all plans', () => {
            beforeEach(function () {
              assert.equal(this.subscriptionPricingExampleThree.items.coupon, undefined);
            });
            beforeEach(applyCoupon('coop-free-trial'));
            it(`applies the free trial to the most valuable subscription`, function () {
              assert.equal(this.price.now.subscriptions, 50.98); // 21.99 * 2 + 5 (setup fee) + 2 (setup fee)
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 0);
              assert.equal(this.price.next.subscriptions, 179.07); // 19.99 * 2 + 90.09 + 49
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
              assert.equal(this.subscriptionPricingExampleThree.items.coupon.code, 'coop-free-trial');
              assert.equal(this.subscriptionPricingExampleThree.price.now.total, 5); // setup fee
            });
          });

          describe('applies to specific plans on the checkout instance', () => {
            beforeEach(applyCoupon('coop-free-trial-plan-basic'));
            it(`applies the free trial to the specific subscription`, function () {
              assert.equal(this.price.now.subscriptions, 121.08); // 21.99 + 2 (setup fee) + 95.09 + 2 (setup fee)
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 0);
              assert.equal(this.price.next.subscriptions, 179.07); // 19.99 * 2 + 90.09 + 49
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
              assert.equal(this.subscriptionPricingExampleTwo.items.plan.code, 'basic');
              assert.equal(this.subscriptionPricingExampleTwo.items.coupon.code, 'coop-free-trial-plan-basic');
              assert.equal(this.subscriptionPricingExampleTwo.price.now.total, 2); // setup fee
            });
          });

          describe('applies to specific plans not on the checkout instance', () => {
            beforeEach(applyCoupon('coop-free-trial-plan-notbasic'));
            it(`applies no free trial`, function () {
              assert.equal(this.price.now.subscriptions, 141.07); // 21.99 * 2 + 95.09 + 2 (setup fee)
              assert.equal(this.price.now.adjustments, 32.44);
              assert.equal(this.price.now.discount, 0);
              assert.equal(this.price.next.subscriptions, 179.07); // 19.99 * 2 + 90.09 + 49
              assert.equal(this.price.next.adjustments, 0);
              assert.equal(this.price.next.discount, 0);
              assert.equal(this.subscriptionPricingExample.items.coupon, undefined);
              assert.equal(this.subscriptionPricingExampleTwo.items.coupon, undefined);
              assert.equal(this.subscriptionPricingExampleThree.items.coupon, undefined);
              assert.equal(this.subscriptionPricingExampleFour.items.coupon, undefined);
            });
          });
        });
      });
    });
  });

  /**
   * Currency
   */

  describe('CheckoutPricing#currency', () => {
    it('Updates the CheckoutPricing and constituent subscription currencies', function (done) {
      this.pricing
        .subscription(this.subscriptionPricingExample)
        .reprice()
        .then(price => {
          assert.equal(price.currency.code, 'USD');
          assert.equal(this.subscriptionPricingExample.price.currency.code, 'USD');
        })
        .currency('EUR')
        .done(price => {
          assert.equal(price.currency.code, 'EUR');
          assert.equal(this.subscriptionPricingExample.price.currency.code, 'EUR');
          done();
        });
    });

    it('throws an error when given a currency not supported by the subscriptions', function (done) {
      this.pricing
        .subscription(this.subscriptionPricingExample)
        .currency('GBP')
        .catch(err => {
          assert.equal(err.code, 'invalid-currency');
          assert.equal(this.pricing.price.currency.code, 'USD');
          done();
        })
        .done();
    });

    it('emits set.currency if the currency changes', function () {
      assert.equal(this.pricing.price.currency.code, 'USD');
      this.pricing.on('set.currency', code => {
        assert.equal(code, 'EUR');
        assert.equal(this.pricing.price.currency.code, 'EUR');
        done();
      });
      this.pricing.currency('EUR');
    });

    it('removes a gift card if the currency changes', function () {
      this.pricing
        .giftCard('super-gift-card')
        .then(() => {
          assert.equal(typeof this.pricing.giftCard, 'object');
        })
        .currency('EUR')
        .done(() => {
          assert.equal(this.pricing.giftCard, undefined);
          done();
        });
    });
  });

  /**
   * Gift cards
   */

  describe('CheckoutPricing#giftCard', () => {
    beforeEach(function () {
      return this.pricing.adjustment({ amount: 50 }).reprice();
    });

    describe('when given an invalid gift card', () => {
      it('throws an error', function (done) {
        this.pricing.giftCard('invalid').catch(err => {
          assert(err.code === 'not-found');
          done();
        });
      });

      it('emits an error', function (done) {
        this.pricing.on('error.giftCard', err => {
          assert(err.code === 'not-found');
          done();
        });
        this.pricing.giftCard('invalid');
      });
    });

    describe('when given an valid gift card', () => {
      it('applies the gift card to the total', function (done) {
        assert.equal(this.pricing.price.now.total, 50);
        this.pricing.giftCard('super-gift-card').done(price => {
          assert.equal(price.now.giftCard, 20);
          assert.equal(price.now.total, 30);
          done();
        });
      });

      it('emits set.giftCard', function (done) {
        this.pricing.on('set.giftCard', giftCard => {
          assert.equal(giftCard.unit_amount, 20);
          done();
        });
        this.pricing.giftCard('super-gift-card');
      });

      describe('when applying a gift card when one is already present', function (done) {
        beforeEach(applyGiftCard('hundred-dollar-card'));

        it('replaces the gift card', function (done) {
          assert.equal(this.pricing.price.now.giftCard, 50);
          assert.equal(this.pricing.price.now.total, 0);
          this.pricing.giftCard('super-gift-card').done(price => {
            assert.equal(price.now.giftCard, 20);
            assert.equal(price.now.total, 30);
            done();
          });
        });

        it('emits unset.giftCard', function (done) {
          this.pricing.on('unset.giftCard', () => {
            assert.equal(this.pricing.items.giftCard, undefined);
            done();
          });
          this.pricing.giftCard('super-gift-card');
        });
      });

      describe('when the gift card amount is greater than the first cycle total', () => {
        beforeEach(function () {
          return this.pricing.subscription(this.subscriptionPricingExample);
        });

        beforeEach(applyGiftCard('hundred-dollar-card'));

        it('carries the remaining gift card amount to the next cycle', function () {
          assert.equal(this.pricing.price.now.giftCard, 71.99);
          assert.equal(this.pricing.price.now.total, 0);
          assert.equal(this.pricing.price.next.giftCard, 19.99);
          assert.equal(this.pricing.price.now.total, 0);
        });
      });
    });
  });

  /**
   * Address
   */

  describe('CheckoutPricing#address', () => {
    it('Assigns address properties', function (done) {
      const address = { country: 'US', postalCode: '94117', vatNumber: 'arbitrary' };
      this.pricing.address(address).done(() => {
        assert.equal(this.pricing.items.address, address);
        done();
      });
    });
  });

  /**
   * Taxes
   */

  describe('CheckoutPricing#tax', () => {
    it('Assigns tax properties', function () {
      const tax = { vatNumber: 'arbitrary' };
      return this.pricing.tax(tax).then(() => {
        assert.equal(this.pricing.items.tax, tax);
      });
    });

    describe('Calculations', () => {
      beforeEach(function () {
        return this.pricing
          .subscription(this.subscriptionPricingExample)
          .adjustment({ amount: 20 })
          .adjustment({ amount: 20, taxCode: 'test' });
      });

      describe('given no address information', () => {
        it('applies no taxes', function (done) {
          this.pricing.reprice().done(price => {
            assert.equal(price.now.taxes, 0);
            assert.equal(price.next.taxes, 0);
            assert.equal(price.taxes.length, 0);
            assert(Array.isArray(price.taxes));
            done();
          });
        });
      });

      describe('given a taxable address', () => {
        beforeEach(function () {
          return this.pricing.address({ country: 'US', postalCode: '94110' });
        });

        it('applies taxes to the price', function (done) {
          this.pricing.reprice().done(price => {
            assert.equal(price.now.taxes, 5.43); // 8.75% of 61.99 (19.99 + 20 + 20)
            assert.equal(price.next.taxes, 1.75); // 8.75% of 19.99
            assert.equal(price.taxes.length, 1);
            assert(Array.isArray(price.taxes));
            done();
          });
        });

        // tax exemption on adjustments, subscriptions
        // varying tax codes on adjustments, subscriptions
        // vat numbers and address info on CheckoutPricing
        // eu taxes
      });
    });
  });
});

function subscriptionPricingFactory (planCode = 'basic', recurly, done) {
  let sub = recurly.Pricing.Subscription();
  return sub.plan(planCode)
    .address({ country: 'US' })
    .done(() => done(sub));
}

function applyCoupon (code) {
  return function () {
    return this.pricing.coupon(code).reprice().then(price => this.price = price);
  };
}

function applyGiftCard (code) {
  return function () {
    return this.pricing.giftCard(code).reprice().then(price => {
      this.price = price;
    });
  }
}
