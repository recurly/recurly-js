import assert from 'assert';
import after from 'lodash.after';
import {PayPal} from '../../lib/recurly/paypal';
import {DirectStrategy} from '../../lib/recurly/paypal/strategy/direct';
import {BraintreeStrategy} from '../../lib/recurly/paypal/strategy/braintree';
import {initRecurly, apiTest, braintreeStub} from '../support/helpers';

const sinon = window.sinon;

apiTest(function (requestMethod) {
  describe(`Recurly.PayPal (${requestMethod})`, function () {
    beforeEach(function () {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.paypal = this.recurly.PayPal();
    });

    it('uses a direct PayPal strategy by default', function () {
      assert(this.paypal.strategy instanceof DirectStrategy);
    });

    describe('when configured to use Braintree', function () {
      const validOpts = { braintree: { clientAuthorization: 'valid' } };

      braintreeStub();

      beforeEach(function () {
        this.paypal = this.recurly.PayPal(validOpts);
      });

      it('uses a Braintree strategy', function () {
        assert(this.paypal.strategy instanceof BraintreeStrategy);
      });

      describe('when the braintree client fails to initialize', function () {
        beforeEach(function () {
          global.braintree.client.create = (opt, cb) => cb({ error: 'test' });
          sinon.spy(this.recurly, 'Frame');
          this.paypal = this.recurly.PayPal(validOpts);
        });

        afterEach(function () {
          this.recurly.Frame.restore();
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
  });
});
