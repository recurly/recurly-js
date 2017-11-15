import assert from 'assert';
import after from 'lodash.after';
import isEqual from 'lodash.isequal';
import {initRecurly} from '../../support/helpers';

describe('CheckoutPricing', function () {
  beforeEach(function (done) {
    this.recurly = initRecurly();
    this.pricing = this.recurly.Pricing.Checkout();

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
          assert.equal(price.now.total, subscriptionTotalNow);
          assert.equal(price.next.total, subscriptionTotalNext);
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

          beforeEach(function (done) {
            subscriptionPricingFactory('basic-gbp', this.recurly, sub => {
              this.subscriptionPricingExampleGBP = sub;
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

          it(`rejects a subscription if it does not support any
              existing subscription currencies`, function (done) {
            this.pricing
              .subscription(this.subscriptionPricingExample)
              .reprice()
              .then(price => {
                assert.equal(price.currency.code, 'USD')
              })
              .subscription(this.subscriptionPricingExampleGBP)
              .catch(err => {
                assert.equal(err.code, 'invalid-subscription-currency');
                assert.equal(err.checkoutCurrency, 'USD');
                assert(isEqual(err.checkoutSupportedCurrencies, ['USD', 'EUR']));
                assert(isEqual(err.subscriptionPlanCurrencies, ['GBP']));
                done();
              })
              .done();
          });
        });
      });

      // test that a sole plan on a checkout can change its plan and update checkout currencies
      describe('plan changes with currency mismatch', () => {
        describe('when one subscription is present', () => {
          beforeEach(function () {
            return this.pricing.subscription(this.subscriptionPricingExample).reprice();
          });

          it('resolves the plan change and updates the checkout currency', function (done) {
            this.subscriptionPricingExample
              .plan('basic-gbp')
              .done(price => {
                assert.equal(price.currency.code, 'GBP');
                assert.equal(this.pricing.currencyCode, 'GBP');
                assert.deepEqual(this.pricing.subscriptionCurrencies, ['GBP']);
                done();
              });
          });
        });

        describe('when multiple subscriptions are present', () => {
          beforeEach(function (done) {
            subscriptionPricingFactory('basic', this.recurly, sub => {
              this.subscriptionPricingExampleTwo = sub;
              done();
            });
          });

          beforeEach(function () {
            return this.pricing
              .subscription(this.subscriptionPricingExample) // EUR, USD
              .subscription(this.subscriptionPricingExampleTwo) // USD only
              .reprice();
          });

          it('rejects the plan change when the new plan does not support the possible currencies', function (done) {
            const part = after(2, done);
            assert.equal(this.pricing.currencyCode, 'USD');
            assert.deepEqual(this.pricing.subscriptionCurrencies, ['USD']);
            this.subscriptionPricingExampleTwo
              .plan('basic-gbp') // GBP only
              .catch(err => {
                assert.equal(err.code, 'invalid-plan-currency');
                part();
              })
              .done(price => {
                assert.equal(price.currency.code, 'USD');
                assert.equal(this.pricing.currencyCode, 'USD');
                assert.deepEqual(this.pricing.subscriptionCurrencies, ['USD']);
                part();
              });
          });
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

    it('sets the currency from the CheckoutPricing currency', function (done) {
      this.pricing
        .adjustment({ amount: 3.99 })
        .then(() => {
          assert.equal(this.pricing.items.currency, 'USD');
          assert.equal(this.pricing.items.adjustments[0].amount, 3.99);
          assert.equal(this.pricing.items.adjustments[0].currency, 'USD');
        })
        .currency('EUR')
        .adjustment({ amount: 5.99 })
        .then(() => {
          assert.equal(this.pricing.items.currency, 'EUR');
          assert.equal(this.pricing.items.adjustments[1].amount, 5.99);
          assert.equal(this.pricing.items.adjustments[1].currency, 'EUR');
          done();
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

    describe('updating an existing adjustment', () => {
      beforeEach(function () {
        this.adjustmentExampleOne = { amount: 20, code: 'adjustment-0' };
        this.adjustmentExampleTwo = {
          amount: 10,
          code: 'adjustment-1',
          currency: 'EUR',
          quantity: 0,
          taxExempt: true,
          taxCode: 'tax-code-0'
        };
        return this.pricing
          .adjustment(this.adjustmentExampleOne)
          .adjustment(this.adjustmentExampleTwo)
          .reprice();
      });

      it('only updates properties supplied', function (done) {
        const part = after(8, done);
        let firstAdjustment = this.pricing.items.adjustments[0]
        let secondAdjustment = this.pricing.items.adjustments[1]

        assert.equal(firstAdjustment.amount, 20);
        assert.equal(firstAdjustment.code, 'adjustment-0');
        assert.equal(firstAdjustment.quantity, 1);
        assert.equal(firstAdjustment.currency, 'USD');
        assert.equal(firstAdjustment.taxExempt, false);
        assert.equal(firstAdjustment.taxCode, undefined);
        assert.deepEqual(secondAdjustment, this.adjustmentExampleTwo);

        this.pricing
          .adjustment({ code: 'adjustment-0' })
          .then(() => {
            assert.equal(firstAdjustment.amount, 20);
            assert.equal(firstAdjustment.code, 'adjustment-0');
            assert.equal(firstAdjustment.quantity, 1);
            assert.equal(firstAdjustment.currency, 'USD');
            assert.equal(firstAdjustment.taxExempt, false);
            assert.equal(firstAdjustment.taxCode, undefined);
            assert.deepEqual(secondAdjustment, this.adjustmentExampleTwo);
            part();
          })
          .adjustment({ code: 'adjustment-0', amount: 400 })
          .then(() => {
            assert.equal(firstAdjustment.amount, 400);
            assert.equal(firstAdjustment.code, 'adjustment-0');
            assert.equal(firstAdjustment.quantity, 1);
            assert.equal(firstAdjustment.currency, 'USD');
            assert.equal(firstAdjustment.taxExempt, false);
            assert.equal(firstAdjustment.taxCode, undefined);
            assert.deepEqual(secondAdjustment, this.adjustmentExampleTwo);
            part();
          })
          .adjustment({ code: 'adjustment-0', quantity: 0 })
          .then(() => {
            assert.equal(firstAdjustment.amount, 400);
            assert.equal(firstAdjustment.code, 'adjustment-0');
            assert.equal(firstAdjustment.quantity, 0);
            assert.equal(firstAdjustment.currency, 'USD');
            assert.equal(firstAdjustment.taxExempt, false);
            assert.equal(firstAdjustment.taxCode, undefined);
            assert.deepEqual(secondAdjustment, this.adjustmentExampleTwo);
            part();
          })
          .adjustment({ code: 'adjustment-0', currency: 'GBP' })
          .then(() => {
            assert.equal(firstAdjustment.amount, 400);
            assert.equal(firstAdjustment.code, 'adjustment-0');
            assert.equal(firstAdjustment.quantity, 0);
            assert.equal(firstAdjustment.currency, 'GBP');
            assert.equal(firstAdjustment.taxExempt, false);
            assert.equal(firstAdjustment.taxCode, undefined);
            assert.deepEqual(secondAdjustment, this.adjustmentExampleTwo);
            part();
          })
          .adjustment({ code: 'adjustment-0', taxExempt: true })
          .then(() => {
            assert.equal(firstAdjustment.amount, 400);
            assert.equal(firstAdjustment.code, 'adjustment-0');
            assert.equal(firstAdjustment.quantity, 0);
            assert.equal(firstAdjustment.currency, 'GBP');
            assert.equal(firstAdjustment.taxExempt, true);
            assert.equal(firstAdjustment.taxCode, undefined);
            assert.deepEqual(secondAdjustment, this.adjustmentExampleTwo);
            part();
          })
          .adjustment({ code: 'adjustment-0', taxCode: 0 })
          .then(() => {
            assert.equal(firstAdjustment.amount, 400);
            assert.equal(firstAdjustment.code, 'adjustment-0');
            assert.equal(firstAdjustment.quantity, 0);
            assert.equal(firstAdjustment.currency, 'GBP');
            assert.equal(firstAdjustment.taxExempt, true);
            assert.equal(firstAdjustment.taxCode, 0);
            assert.deepEqual(secondAdjustment, this.adjustmentExampleTwo);
            part();
          })
          .adjustment({
            code: 'adjustment-0',
            amount: 25,
            currency: 'USD',
            quantity: 10,
            taxExempt: true,
            taxCode: 'tax-code-1'
          })
          .then(() => {
            assert.equal(firstAdjustment.amount, 25);
            assert.equal(firstAdjustment.code, 'adjustment-0');
            assert.equal(firstAdjustment.quantity, 10);
            assert.equal(firstAdjustment.currency, 'USD');
            assert.equal(firstAdjustment.taxExempt, true);
            assert.equal(firstAdjustment.taxCode, 'tax-code-1');
            assert.deepEqual(secondAdjustment, this.adjustmentExampleTwo);
            part();
          })
          .adjustment({
            code: 'adjustment-1',
            amount: 0,
            quantity: 1,
          })
          .done(price => {
            assert.equal(firstAdjustment.amount, 25);
            assert.equal(firstAdjustment.code, 'adjustment-0');
            assert.equal(firstAdjustment.quantity, 10);
            assert.equal(firstAdjustment.currency, 'USD');
            assert.equal(firstAdjustment.taxExempt, true);
            assert.equal(firstAdjustment.taxCode, 'tax-code-1');

            assert.equal(secondAdjustment.amount, 0);
            assert.equal(secondAdjustment.code, 'adjustment-1');
            assert.equal(secondAdjustment.quantity, 1);
            assert.equal(secondAdjustment.currency, 'EUR');
            assert.equal(secondAdjustment.taxExempt, true);
            assert.equal(secondAdjustment.taxCode, 'tax-code-0');
            part();
          });
      });
    });

    describe('given multiple currencies', () => {
      beforeEach(function () {
        return this.pricing
          .adjustment({ amount: 10, currency: 'USD' })
          .adjustment({ amount: 20, currency: 'USD' })
          .adjustment({ amount: 50, currency: 'EUR' })
          .adjustment({ amount: 100, currency: 'GBP' })
          .reprice();
      });

      it(`calculates subtotals only from adjustments matching
          the checkout currency`, function (done) {
        this.pricing
          .reprice()
          .then(price => {
            // all adjustments are present
            assert.equal(this.pricing.items.adjustments.length, 4);
            assert.equal(price.currency.code, 'USD');
            // only the USD adjustments factor into the price
            assert.equal(price.now.items.length, 2);
            assert.equal(price.now.adjustments, 30);
          })
          .currency('EUR')
          .reprice()
          .then(price => {
            assert.equal(this.pricing.items.adjustments.length, 4);
            assert.equal(price.currency.code, 'EUR');
            assert.equal(price.now.items.length, 1);
            assert.equal(price.now.adjustments, 50);
          })
          .currency('GBP')
          .reprice()
          .then(price => {
            assert.equal(this.pricing.items.adjustments.length, 4);
            assert.equal(price.currency.code, 'GBP');
            assert.equal(price.now.items.length, 1);
            assert.equal(price.now.adjustments, 100);
            done();
          })
          .done();
      });
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
   * Subscriptions
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
   * address - TODO
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

    it('emits set.currency if the currency changes', function (done) {
      assert.equal(this.pricing.price.currency.code, 'USD');
      this.pricing.on('set.currency', code => {
        assert.equal(code, 'EUR');
        assert.equal(this.pricing.items.currency, 'EUR');
        done();
      });
      this.pricing.currency('EUR');
    });

    it('removes a gift card if the currency changes', function (done) {
      this.pricing
        .adjustment({ amount: 10, currency: 'USD' })
        .adjustment({ amount: 20, currency: 'EUR' })
        .giftCard('super-gift-card')
        .reprice()
        .then(price => {
          assert.equal(price.now.giftCard, 10);
          assert.equal(price.now.total, 0);
          assert.equal(typeof this.pricing.items.giftCard, 'object');
        })
        .currency('EUR')
        .reprice()
        .done(price => {
          assert.equal(price.now.giftCard, 0);
          assert.equal(price.now.total, 20);
          assert.equal(this.pricing.items.giftCard, undefined);
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
            assert.equal(price.now.subtotal, 61.99); // 21.99 + 20 + 20
            assert.equal(price.now.taxes, 5.43); // 8.75% of 61.99
            assert.equal(price.now.total, 67.42);
            assert.equal(price.next.subtotal, 19.99);
            assert.equal(price.next.taxes, 1.75); // 8.75% of 19.99
            assert.equal(price.next.total, 21.74);

            assert.equal(price.taxes.length, 1);
            assert(Array.isArray(price.taxes));
            done();
          });
        });

        describe('given some tax exempt adjustments and subscriptions', () => {
          beforeEach(function (done) {
            subscriptionPricingFactory('tax_exempt', this.recurly, sub => {
              this.subscriptionPricingExampleTaxExempt = sub;
              done();
            });
          });

          beforeEach(function () {
            return this.pricing
              .subscription(this.subscriptionPricingExampleTaxExempt) // $2 setup fee
              .adjustment({ amount: 10, taxExempt: true })
              .adjustment({ amount: 27.25, taxExempt: false })
              .reprice();
          });

          it('only calculates tax on the tax eligible items', function (done) {
            this.pricing
              .reprice()
              .done(price => {
                assert.equal(price.now.subtotal, 101.24); // subs (21.99 + 2) + adj (20 + 20 + 10 + 27.25)
                assert.equal(price.now.taxes, 7.81); // 8.75% of $89.24 taxable (21.99 + 20 + 20 + 27.25)
                assert.equal(price.next.taxes, 1.75); // 8.75% of $19.99 tax eligible
                done();
              });
          });
        });

        describe('given a variety of tax codes on adjustments and subscriptions', () => {
          beforeEach(function () {
            return this.subscriptionPricingExample
              .tax({ taxCode: 'valid-tax-code' }) // 2%
              .reprice();
          });

          beforeEach(function () {
            return this.pricing
              .address({ country: 'US', postalCode: '94110' })
              .subscription(this.subscriptionPricingExample)
              .adjustment({ amount: 10, taxCode: 'test-tax-code-adj-1' })
              .adjustment({ amount: 27.25, taxCode: 'test-tax-code-adj-2' })
              .reprice();
          });

          it('requests tax amounts for each code', function (done) {
            sinon.spy(this.recurly, 'tax');
            this.pricing
              .reprice()
              .then(price => {
                assert(this.recurly.tax.calledWith(sinon.match({ taxCode: 'valid-tax-code' })));
                assert(this.recurly.tax.calledWith(sinon.match({ taxCode: 'test-tax-code-adj-1' })));
                assert(this.recurly.tax.calledWith(sinon.match({ taxCode: 'test-tax-code-adj-2' })));
                done();
              })
              .done();
          });

          it('applies varied tax rates to their applicable items', function (done) {
            this.pricing
              .reprice()
              .then(price => {
                assert.equal(price.now.subtotal, 99.24);
                assert.equal(price.now.taxes, 7.20); // (2% of 21.99) + (8.75% of 20 + 20 + 10 + 27.25)
                assert.equal(price.now.total, 106.44);
                assert.equal(price.next.subtotal, 19.99);
                assert.equal(price.next.taxes, 0.40); // 2% of 19.99
                assert.equal(price.next.total, 20.39);
                assert.equal(price.taxes.length, 2);
                assert.deepEqual(price.taxes.map(t => t.rate), ['0.0875', '0.02']);
                done();
              })
              .done();
          });
        });

        describe('given VAT numbers on address and tax info', () => {
          it('takes the VAT number from the tax info', function (done) {
            sinon.spy(this.recurly, 'tax');
            this.pricing
              .subscription(this.subscriptionPricingExample)
              .address({ vatNumber: 'on-address' })
              .tax({ vatNumber: 'on-tax-info' })
              .then(() => {
                assert.equal(this.pricing.items.address.vatNumber, 'on-address');
                assert.equal(this.pricing.items.tax.vatNumber, 'on-tax-info');
              })
              .reprice()
              .done(price => {
                assert(this.recurly.tax.lastCall.calledWith(sinon.match({ vatNumber: 'on-tax-info' })));
                done();
              });
          });
        });
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

function applyGiftCard (code) {
  return function () {
    return this.pricing.giftCard(code).reprice().then(price => {
      this.price = price;
    });
  }
}

function applyGiftCard (code) {
  return function () {
    return this.pricing.giftCard(code).reprice().then(price => {
      this.price = price;
    });
  }
}
