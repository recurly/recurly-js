import assert from 'assert';
import { Recurly } from '../../lib/recurly';
import { apiTest, initRecurly } from './support/helpers';

apiTest((requestMethod) => {
  describe(`Recurly.item (${requestMethod})`, () => {
    beforeEach(function () {
      this.sandbox = sinon.createSandbox();
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.valid = { itemCode: 'basic-item' };
      this.invalid = { itemCode: 'invalid' };
    });

    it('requires an itemCode', function () {
      const { recurly } = this;
      assert.throws(() => recurly.item(), { message: 'Option itemCode must be a String' });
    });

    it('requires Recurly.configure', function (done) {
      const { sandbox, valid } = this;
      const recurly = new Recurly();
      const stub = sandbox.stub();
      recurly.item(valid)
        .then(stub)
        .catch(err => {
          assert(stub.notCalled);
          assert.strictEqual(err.code, 'not-configured');
          done();
        });
    });

    describe('when given an invalid itemCode', function () {
      it('rejects with an error', function (done) {
        const { invalid, recurly, sandbox } = this;
        const stub = sandbox.stub();
        recurly.item(invalid)
          .then(stub)
          .catch(err => {
            assert(stub.notCalled);
            assert.strictEqual(err.code, 'not-found');
            assert.strictEqual(err.message, "Couldn't find Item with item_code=invalid");
            done();
          });
      });
    });

    describe('when given a valid itemCode', function () {
      it('resolves with an item', function (done) {
        const { recurly, sandbox, valid } = this;
        const stub = sandbox.stub();
        recurly.item(valid)
          .catch(stub)
          .then(item => {
            assert(stub.notCalled);
            assert.strictEqual(item.code, 'basic-item');
            assert.strictEqual(item.name, 'Basic Item');
            assert.strictEqual(item.tax_code, null);
            assert.strictEqual(item.tax_exempt, true);
            assert(Array.isArray(item.currencies));
            assert.strictEqual(item.currencies.length, 2);
            assert.strictEqual(item.currencies[0].currency_code, 'CAD');
            assert.strictEqual(item.currencies[0].currency_symbol, '$');
            assert.strictEqual(item.currencies[0].unit_amount, 60.0);
            assert.strictEqual(item.currencies[1].currency_code, 'USD');
            assert.strictEqual(item.currencies[1].currency_symbol, '$');
            assert.strictEqual(item.currencies[1].unit_amount, 40.0);
            done();
          });
      });
    });
  });
});
