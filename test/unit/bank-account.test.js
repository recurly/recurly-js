import assert from 'assert';
import clone from 'component-clone';
import after from 'lodash.after';
import merge from 'lodash.merge';
import { Recurly } from '../../lib/recurly';
import { fixture } from './support/fixtures';
import { initRecurly, apiTest, testBed } from './support/helpers';

apiTest(function (requestMethod) {
  describe('Recurly.bankAccount', function () {
    beforeEach(function (done) {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.recurly.ready(done);
    });

    describe(`Recurly.bankAccount.token (${requestMethod})`, function () {
      const valid = {
        routing_number: '123456780',
        account_number: '1987649876',
        account_number_confirmation: '1987649876',
        account_type: 'checking',
        name_on_account: 'John Smith',
        country: 'US'
      };

      it('requires a callback', function () {
        const { recurly } = this;
        try {
          recurly.bankAccount.token(valid);
        } catch (e) {
          assert(~e.message.indexOf('callback'));
        }
      });

      it('requires Recurly.configure', function () {
        try {
          const recurly = new Recurly();
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
          return testBed().querySelector('#test-form');
        });
      });

      function tokenSuite (builder) {
        describe('when given a blank value', function () {
          const example = merge(clone(valid), {
            name_on_account: ''
          });

          it('produces a validation error', function (done) {
            const { recurly } = this;
            recurly.bankAccount.token(builder(example), (err, token) => {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(err.fields[0] === 'name_on_account');
              assert(!token);
              done();
            });
          });
        });

        describe('when given valid values', function () {
          const examples = [
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
            const { recurly } = this;
            const part = after(examples.length, done);

            examples.forEach(example => {
              recurly.bankAccount.token(builder(example), (err, token) => {
                assert(!err);
                assert(token.id);
                part();
              });
            });
          });

          it('sets the value of a data-recurly="token" field', function (done) {
            const { recurly } = this;
            const part = after(examples.length, done);

            examples.forEach(example => {
              recurly.bankAccount.token(builder(example), (err, token) => {
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

        describe('when given a valid IBAN', function () {
          const validIban = {
            iban: 'FR1420041010050500013M02606',
            name_on_account: 'John Smith',
            country: 'NO'
          };

          it('yields a token', function (done) {
            const { recurly } = this;
            recurly.bankAccount.token(validIban, (err, token) => {
              assert(!err);
              assert(token.id);
              done();
            });
          });

        describe('when given a valid Bacs', function () {
          const validBacs = {
            account_number: '55779911',
            account_number_confirmation: '55779911',
            sort_code: '200000',
            name_on_account: 'Sir John Smith',
            type: 'bacs'
          };

          it('yields a token', function (done) {
            const { recurly } = this;
            recurly.bankAccount.token(validBacs, (err, token) => {
              assert(!err);
              assert(token.id);
              done();
            });
          });
        });
        });

        describe('when given a valid BECS', function () {
          const validBecs = {
            account_number: '012345678',
            account_number_confirmation: '012345678',
            name_on_account: 'John Smith',
            bsb_code: '200-000',
            type: 'becs',
            country: 'AU'
          };

          it('yields a token', function (done) {
            const { recurly } = this;
            recurly.bankAccount.token(validBecs, (err, token) => {
              assert(!err);
              assert(token.id);
              done();
            });
          });
        });
      }
    });

    describe('Recurly.bankAccount.bankInfo (' + requestMethod + ')', function () {
      context('Bacs Bank Account', function () {
        it('requires a account_number_confirmation', function (done) {
          const invalidBacs = {
            account_number: '55779911',
            sort_code: '200000',
            name_on_account: 'Sir John Smith',
            type: 'bacs',
          };

          recurly.bankAccount.token(invalidBacs, (err, token) => {
            assert(err);
            assert(~err.message.indexOf('validating'));
            done();
          });
        });
      });

      context('Bank Account', function () {
        const valid = {
          routingNumber: '123456780'
        };

        it('requires a callback', function () {
          try {
            recurly.bankAccount.bankInfo(valid);
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
});
