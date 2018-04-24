import assert from 'assert';
import clone from 'component-clone';
import after from 'lodash.after';
import merge from 'lodash.merge';
import {Recurly} from '../lib/recurly';
import {fixture} from './support/fixtures';
import {initRecurly, apiTest, domTest} from './support/helpers';


apiTest(function (requestMethod) {
  describe(`Recurly.Adyen (${requestMethod})`, function () {
    beforeEach(function () {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.adyen = this.recurly.Adyen();
    });

    let validPayload = {
      invoiceUuid: "asdf1234",
      countryCode: "US",
      shopperLocale: "en_US",
      skinCode: "12345678"
    }

    it('raises an error for invalid country code', function () {
      let invalidPayload = validPayload.countryCode = "USA"

      this.adyen.start(invalidPayload), (err, token) => {
        assert(err.code === 'validation');
      }
    });

    it('raises an error for invalid skinCode', function () {
      let invalidPayload = validPayload.skinCode = "123"

      this.adyen.start(invalidPayload), (err, token) => {
        assert(err.code === 'validation');
      }
    });

    it('raises an error for invalid shopperLocale', function () {
      let invalidPayload = validPayload.shopperLocale = "enfoo"

      this.adyen.start(invalidPayload), (err, token) => {
        assert(err.code === 'validation');
      }
    });

    it('raises an error for an empty invoiceUuid', function () {
      let invalidPayload = validPayload.invoiceUuid = '';

      this.adyen.start(invalidPayload), (err, token) => {
        assert(err.code === 'validation');
      }
    });
  });
});
