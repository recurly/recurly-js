import assert from 'assert';
import clone from 'component-clone';
import after from 'lodash.after';
import merge from 'lodash.merge';
import helpers from './support/helpers';
import {Recurly} from '../lib/recurly';
import {fixture} from './fixtures/index';

helpers.apiTest(function (requestMethod) {
  let recurly;

  fixture('minimal');

  beforeEach(() => {
    recurly = new Recurly;
    recurly.configure({
      publicKey: 'test',
      api: `//${window.location.host}/api`,
      cors: requestMethod === 'cors'
    });
  });

  describe(`Recurly.bankAccount.token (${requestMethod})`, () => {
    var valid = {
      routing_number: '123456780',
      account_number: '1987649876',
      account_number_confirmation: '1987649876',
      account_type: 'checking',
      name_on_account: 'John Smith',
      country: 'US'
    };

    it('requires a callback', () => {
      try {
        recurly.bankAccount.token(valid);
      } catch (e) {
        assert(~e.message.indexOf('callback'));
      }
    });

    it('requires Recurly.configure', () => {
      try {
        recurly = new Recurly();
        recurly.bankAccount.token(valid, () => {});
      } catch (e) {
        assert(~e.message.indexOf('configure'));
      }
    });

    describe('when called with a plain object', () => {
      tokenSuite((values, runner) => {
        return runner(values);
      });
    });

    describe('when called with an HTMLFormElement', () => {
      tokenSuite((values, runner) => {
        helpers.domTest((testbed, done) => {
          testbed.insertAdjacentHTML('beforeend',
            ' <form id="test-form"> ' +
            '   <input type="text" data-recurly="name_on_account" value="' + values.name_on_account + '"> ' +
            '   <input type="text" data-recurly="routing_number" value="' + values.routing_number + '"> ' +
            '   <input type="text" data-recurly="account_number" value="' + values.account_number + '"> ' +
            '   <input type="text" data-recurly="account_number_confirmation" value="' + values.account_number_confirmation + '"> ' +
            '   <input type="text" data-recurly="account_type" value="' + values.account_type + '"> ' +
            '   <input type="text" data-recurly="address1" value="' + values.address1 + '"> ' +
            '   <input type="text" data-recurly="address2" value="' + values.address2 + '"> ' +
            '   <input type="text" data-recurly="city" value="' + values.city + '"> ' +
            '   <input type="text" data-recurly="state" value="' + values.state + '"> ' +
            '   <input type="text" data-recurly="postal_code" value="' + values.postal_code + '"> ' +
            '   <input type="text" data-recurly="country" value="' + values.country + '"> ' +
            '   <input type="text" data-recurly="phone" value="' + values.phone + '"> ' +
            '   <input type="text" data-recurly="vat_number" value="' + values.vat_number + '"> ' +
            '   <input type="hidden" name="recurly-token" data-recurly="token"> ' +
            '   <button>submit</button> ' +
            ' </form> '
          );

          runner(testbed.querySelector('#test-form'));
          done();
        });
      });
    });

    function tokenSuite (builder) {
      describe('when given a blank value', () => {
        var example = merge(clone(valid), {
          name_on_account: ''
        });

        it('produces a validation error', (done) => {
          builder(example, (example) => {
            recurly.bankAccount.token(example, (err, token) => {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(err.fields[0] === 'name_on_account');
              assert(!token);
              done();
            });
          });
        });
      });

      describe('when given valid values', () => {
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

        it('yields a token', (done) => {
          var part = after(examples.length, done);

          examples.forEach( (example) => {
            builder(example, (example) => {
              recurly.bankAccount.token(example, (err, token) => {
                assert(!err);
                assert(token.id);
                part();
              });
            });
          });
        });

        it('sets the value of a data-recurly="token" field', (done) => {
          var part = after(examples.length, done);

          examples.forEach( (example) => {
            builder(example, (example) => {
              recurly.bankAccount.token(example, (err, token) => {
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
      });
    }
  });

  describe('Recurly.bankAccount.bankInfo (' + requestMethod + ')', () => {
    var valid = {
      routingNumber: '123456780'
    };

    it('requires a callback', () => {
      try {
        recurly.bankAccount.bankInfo(valid);
      } catch (e) {
        assert(~e.message.indexOf('callback'));
      }
    });

    it('requires a routingNumber', () => {
      recurly.bankAccount.bankInfo({}, (err, bankInfo) => {
        assert(err.code === 'validation');
        assert(err.fields.length === 1);
        assert(err.fields[0] === 'routingNumber');
        assert(!bankInfo);
      });
    });
  });
});
