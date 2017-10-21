import assert from 'assert';
import each from 'component-each';
import merge from 'lodash.merge';
import {Recurly} from '../../../lib/recurly';
import {initRecurly, apiTest, braintreeStub} from '../../support/helpers';

apiTest(function (requestMethod) {
  describe(`BraintreeStrategy (${requestMethod})`, function () {
    const validOpts = { braintree: { clientAuthorization: 'valid' } };

    braintreeStub();

    beforeEach(function () {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.paypal = this.recurly.PayPal(validOpts);
    });
  });
});
