import assert from 'assert';
import { initRecurly } from './support/helpers';

describe('Recurly.Adyen', function () {
  beforeEach(function () {
    this.recurly = initRecurly();
    this.adyen = this.recurly.Adyen();
  });

  afterEach(function () {
    this.recurly.destroy();
  });

  let validPayload = {
    invoiceUuid: 'asdf1234',
    countryCode: 'US',
    shopperLocale: 'en_US',
    skinCode: '12345678'
  };

  it('raises an error for invalid country code', function (done) {
    let invalidPayload = validPayload.countryCode = 'USA';
    this.adyen.on('error', err => {
      assert(err.code === 'validation');
      done();
    });
    this.adyen.start(invalidPayload);
  });

  it('raises an error for invalid skinCode', function (done) {
    let invalidPayload = validPayload.skinCode = '123';
    this.adyen.on('error', err => {
      assert(err.code === 'validation');
      done();
    });
    this.adyen.start(invalidPayload);
  });

  it('raises an error for invalid shopperLocale', function (done) {
    let invalidPayload = validPayload.shopperLocale = 'enfoo';
    this.adyen.on('error', err => {
      assert(err.code === 'validation');
      done();
    });
    this.adyen.start(invalidPayload);
  });

  it('raises an error for an empty invoiceUuid', function (done) {
    let invalidPayload = validPayload.invoiceUuid = '';
    this.adyen.on('error', err => {
      assert(err.code === 'validation');
      done();
    });
    this.adyen.start(invalidPayload);
  });
});
