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
   * Coupons - TODO
   */

  describe('CheckoutPricing#coupon', () => {
    // invalid coupon
    // coupon applying only to adjustments
    // coupon applying only to plans
    //  - all plans
    //  - specific plans
    //    - on checkout
    //    - not on checkout
    // coupon applying to adjustments and plans
    //  - all plans
    //  - specific plan not not checkout
    // subscription-level coupon
    //  - percent, fixed, free trial
    //  - applies to adjustments, plans, both
  });

  /**
   * address - TODO
   */

  describe('CheckoutPricing#address', () => {});
});

function subscriptionPricingFactory (planCode = 'basic', recurly, done) {
  let sub = recurly.Pricing.Subscription();
  return sub.plan(planCode)
    .address({ country: 'US' })
    .done(() => done(sub));
}
