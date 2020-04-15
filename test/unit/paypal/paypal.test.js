import assert from 'assert';
import after from 'lodash.after';
import { PayPal } from '../../../lib/recurly/paypal';
import { DirectStrategy } from '../../../lib/recurly/paypal/strategy/direct';
import { BraintreeStrategy } from '../../../lib/recurly/paypal/strategy/braintree';
import { initRecurly, apiTest, stubBraintree, stubWindowOpen } from '../support/helpers';

apiTest(function (requestMethod) {
  describe(`Recurly.PayPal (${requestMethod})`, function () {
    stubWindowOpen();

    beforeEach(function () {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.paypal = this.recurly.PayPal();
      this.sandbox = sinon.createSandbox();
    });

    it('uses a direct PayPal strategy by default', function () {
      assert(this.paypal.strategy instanceof DirectStrategy);
    });

    describe('when configured to use Braintree', function () {
      const validOpts = { braintree: { clientAuthorization: 'valid' } };

      stubBraintree();

      beforeEach(function () {
        this.paypal = this.recurly.PayPal(validOpts);
      });

      it('uses a Braintree strategy', function () {
        assert(this.paypal.strategy instanceof BraintreeStrategy);
      });

      describe('when the braintree client fails to initialize', function () {
        beforeEach(function () {
          window.braintree.client.create = (opt, cb) => cb({ error: 'test' });
          this.sandbox = sinon.createSandbox();
          this.sandbox.spy(this.recurly, 'Frame');
          this.paypal = this.recurly.PayPal(validOpts);
        });

        afterEach(function () {
          const { sandbox } = this;
          const { Frame } = this.recurly;
          Frame.getCalls().forEach(c => c.returnValue.destroy());
          sandbox.restore();
        });

        it('falls back to a direct PayPal strategy', function (done) {
          this.paypal.ready(() => {
            assert(this.paypal.strategy instanceof DirectStrategy);
            done();
          })
        });

        it('falls back to direct PayPal flow', function (done) {
          this.paypal.ready(() => {
            this.paypal.start();
            assert(this.recurly.Frame.calledOnce);
            done();
          });
        });
      });
    });

    describe('destroy', function () {
      it('deletes the strategy and removes listeners', function () {
        this.sandbox.spy(this.paypal, 'off');
        this.paypal.destroy();
        assert.equal(this.paypal.strategy, undefined);
        assert(this.paypal.off.calledOnce);
      })
    })
  });
});
