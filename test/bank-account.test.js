import assert from 'assert';
import clone from 'component-clone';
import after from 'lodash.after';
import merge from 'lodash.merge';
import { Recurly } from '../lib/recurly';
import { fixture } from './support/fixtures';
import { initRecurly, apiTest } from './support/helpers';

apiTest(function (requestMethod) {
  describe('Recurly.bankAccount', function () {
    beforeEach(function (done) {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.recurly.ready(done);
    });

    describe(`Recurly.bankAccount.token (${requestMethod})`, function () {
      var valid = {
        routing_number: '123456780',
        account_number: '1987649876',
        account_number_confirmation: '1987649876',
        account_type: 'checking',
        name_on_account: 'John Smith',
        country: 'US'
      };

      it('requires a callback', function () {
        try {
          this.recurly.bankAccount.token(valid);
        } catch (e) {
          assert(~e.message.indexOf('callback'));
        }
      });

      it('requires Recurly.configure', function () {
        try {
          let recurly = new Recurly();
          recurly.bankAccount.token(valid, function () {});
        } catch (e) {
          assert(~e.message.indexOf('configure'));
        }
      });

      describe('when called with a plain object', function () {
        tokenSuite(values => values);
      });

      describe('when called with an HTMLFormElement', function () {
        tokenSuite(example => {
          fixture('bank', example);
          return window.document.querySelector('#test-form');
        });
      });

      function tokenSuite (builder) {
        describe('when given a blank value', function () {
          var example = merge(clone(valid), {
            name_on_account: ''
          });

          it('produces a validation error', function (done) {

            this.recurly.bankAccount.token(builder(example), (err, token) => {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(err.fields[0] === 'name_on_account');
              assert(!token);
              done();
            });
          });
        });

        describe('when given valid values', function () {
          var examples = [
            valid,
            merge({
              address1: '400 Alabama St.',
              address2: 'Suite 202',
              city: 'San Francisco',
              state: 'CA',
              postal_code: '94110',
              phone: '1-844-732-8759'
            }, valid)
          ];

          it('yields a token', function (done) {
            var part = after(examples.length, done);

            examples.forEach(example => {
              this.recurly.bankAccount.token(builder(example), (err, token) => {
                assert(!err);
                assert(token.id);
                part();
              });
            });
          });

          it('sets the value of a data-recurly="token" field', function (done) {
            var part = after(examples.length, done);

            examples.forEach(example => {
              this.recurly.bankAccount.token(builder(example), (err, token) => {
                assert(!err);
                assert(token.id);
                if (example && example.nodeType === 3) {
                  assert(example.querySelector('[data-recurly=token]').value === token.id);
                }
                part();
              });
            });
          });
        });
      }
    });

    describe('Recurly.bankAccount.bankInfo (' + requestMethod + ')', function () {
      var valid = {
        routingNumber: '123456780'
      };

      it('requires a callback', function () {
        try {
          this.recurly.bankAccount.bankInfo(valid);
        } catch (e) {
          assert(~e.message.indexOf('callback'));
        }
      });

      it('requires a routingNumber', function () {
        recurly.bankAccount.bankInfo({}, (err, bankInfo) => {
          assert.strictEqual(err.code, 'validation');
          assert.strictEqual(err.fields.length, 1);
          assert.strictEqual(err.fields[0], 'routing_number');
          assert(!bankInfo);
        });
      });
    });

    describe('when given a routingNumber', function () {
      it('responds with bank info', function () {
        const { recurly } = this;
        recurly.bankAccount.bankInfo({ routingNumber: 'test-routing-number' }, (err, bankInfo) => {
          assert.deepEqual(bankInfo, { bank_name: 'test-bank-name' });
          assert(!err);
        });
      });
    });
  });
});
