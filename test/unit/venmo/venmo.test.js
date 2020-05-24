import assert from 'assert';
import after from 'lodash.after';
import { BraintreeStrategy } from '../../../lib/recurly/venmo/strategy/braintree';
import { initRecurly, apiTest, stubBraintree, stubWindowOpen } from '../support/helpers';

apiTest(function (requestMethod) {
  describe(`Recurly.Venmo (${requestMethod})`, function () {
    stubWindowOpen();
    stubBraintree();

    const validOpts = { braintree: { clientAuthorization: 'valid' } };

    beforeEach(function () {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.venmo = this.recurly.Venmo(validOpts);
      this.sandbox = sinon.createSandbox();
    });

    it('uses a Braintree strategy by default', function () {
      assert(this.venmo.strategy instanceof BraintreeStrategy);
    });

    describe('destroy', function () {
      it('deletes the strategy and removes listeners', function () {
        this.sandbox.spy(this.venmo, 'off');
        this.venmo.destroy();
        assert.equal(this.venmo.strategy, undefined);
        assert(this.venmo.off.calledOnce);
      })
    })
  });
});
