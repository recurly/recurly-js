import assert from 'assert';
import {Recurly} from '../../lib/recurly';
import {PayPal} from '../../lib/recurly/paypal';
import {BraintreePayPal} from '../../lib/recurly/paypal/braintree';
import {initRecurly, apiTest, braintreeStub} from '../support/helpers';

apiTest(function (requestMethod) {
  describe(`Recurly.PayPal factory (${requestMethod})`, function () {
    beforeEach(function () {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.paypal = this.recurly.PayPal({});
    });

    it('returns a PayPal instance', function () {
      assert.equal(this.paypal instanceof PayPal, true);
    });

    describe('when configured to use Braintree', function () {
      const validOpts = { braintree: { clientAuthorization: 'valid' } };

      braintreeStub();

      beforeEach(function () {
        this.paypal = this.recurly.PayPal(validOpts);
      });

      it('returns a BraintreePayPal instance', function () {
        assert.equal(this.paypal instanceof BraintreePayPal, true);
      });
    });
  });
});
