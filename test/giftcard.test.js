import each from 'lodash.foreach';
import assert from 'assert';
import Recurly from '../lib/recurly';
import {apiTest} from './support/helpers';

apiTest(function (requestMethod) {
  describe('Recurly.giftcard (' + requestMethod + ')', function () {
    const valid = { giftcard: 'superGiftcardForMe' };
    const invalid = { giftcard: 'invalidCard' };
    let recurly;

    beforeEach(function () {
      recurly = new Recurly;
      recurly.configure({
        publicKey: 'test',
        api: `//${window.location.host}/api`,
        cors: requestMethod === 'cors'
      });
    });

    it('requires a callback', function () {
      try {
        recurly.giftcard(valid);
      } catch (e) {
        assert(~e.message.indexOf('callback'));
      }
    });

    it('requires Recurly.configure', function () {
      try {
        recurly = new Recurly();
        recurly.giftcard(valid, () => {});
      } catch (e) {
        assert(~e.message.indexOf('configure'));
      }
    });

    describe('when given an invalid giftcard', function () {
      it('produces an error', function (done) {
        recurly.giftcard(invalid, function (err, giftcard) {
          assert(err);
          assert(!giftcard);
          done();
        });
      });
    });

    describe('when given a valid giftcard', function () {
      it('contains a discount amount', function (done) {
        recurly.giftcard(valid, function(err, giftcard){
          assert(giftcard.unit_amount === 20);
          assert(giftcard.currency === "USD");
          done();
        });
      });
    });

  });
});
