import assert from 'assert';
import after from 'lodash.after';
import merge from 'lodash.merge';
import clone from 'component-clone';
import {Recurly} from '../lib/recurly';
import {initRecurly, apiTest, domTest} from './support/helpers';

apiTest(requestMethod => {
  describe(`Recurly.token (${requestMethod})`, () => {
    const valid = {
      number: '4111111111111111',
      month: '01',
      year: new Date().getFullYear() + 1,
      first_name: 'foo',
      last_name: 'bar'
    };
    let recurly;

    beforeEach(done => {
      recurly = initRecurly({ cors: requestMethod === 'cors' });
      recurly.on('ready', done);
    });

    it('requires a callback', () => {
      try {
        recurly.token(valid);
      } catch (e) {
        assert(~e.message.indexOf('callback'));
      }
    });

    it('requires Recurly.configure', () => {
      try {
        recurly = new Recurly();
        recurly.token(valid, () => {});
      } catch (e) {
        assert(~e.message.indexOf('configure'));
      }
    });

    describe('when called with a plain object', () => {
      tokenSuite((values, runner) => {
        return runner(values);
      });
    });

    // TODO: Rebuild this for fixtures...
    describe('when called with an HTMLFormElement', () => {
      tokenSuite((values, runner) => {
        domTest((testbed, done) => {
          testbed.insertAdjacentHTML('beforeend',
            `
            <form id="test-form"> ' +
              <input type="text" data-recurly="number" value="${(values.number || '')}">
              <input type="text" data-recurly="month" value="${(values.month || '')}">
              <input type="text" data-recurly="year" value="${(values.year || '')}">
              <input type="text" data-recurly="cvv" value="${(values.cvv || '')}">
              <input type="text" data-recurly="first_name" value="${(values.first_name || '')}">
              <input type="text" data-recurly="last_name" value="${(values.last_name || '')}">
              <input type="text" data-recurly="address1" value="${(values.address1 || '')}">
              <input type="text" data-recurly="address2" value="${(values.address2 || '')}">
              <input type="text" data-recurly="city" value="${(values.city || '')}">
              <input type="text" data-recurly="state" value="${(values.state || '')}">
              <input type="text" data-recurly="postal_code" value="${(values.last_name || '')}">
              <input type="text" data-recurly="phone" value="${(values.phone || '')}">
              <input type="text" data-recurly="vat_number" value="${(values.vat_number || '')}">
              <input type="text" data-recurly="country" value="${(values.country || '')}">
              <input type="hidden" name="recurly-token" data-recurly="token">
              <button>submit</button>
            </form>
            `
          );

          runner(testbed.querySelector('#test-form'));
          done();
        });
      });
    });

    function tokenSuite (builder) {
      describe('when given an invalid card number', () => {
        var example = merge(clone(valid), {
          number: '4111111111111112'
        });

        it('produces a validation error', done => {
          builder(example, example => {
            recurly.token(example, (err, token) => {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(err.fields[0] === 'number');
              assert(!token);
              done();
            });
          });
        });
      });

      describe('when given an invalid expiration', () => {
        var example = merge(clone(valid), {
          year: new Date().getFullYear() - 1
        });

        it('produces a validation error', done => {
          builder(example, example => {
            recurly.token(example, (err, token) => {
              assert(err.code === 'validation');
              assert(err.fields.length === 2);
              assert(~err.fields.indexOf('month'));
              assert(~err.fields.indexOf('year'));
              assert(!token);
              done();
            });
          });
        });
      });

      describe('when given a blank value', () => {
        var example = merge(clone(valid), {
          first_name: ''
        });

        it('produces a validation error', done => {
          builder(example, example => {
            recurly.token(example, (err, token) => {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(err.fields[0] === 'first_name');
              assert(!token);
              done();
            });
          });
        });
      });

      describe('when given a declining card', () => {
        var example = merge(clone(valid), {
          number: '4000000000000002'
        });

        it('produces a validation error', done => {
          builder(example, example => {
            recurly.token(example, (err, token) => {
              assert(err.code === 'declined')
              assert(err.message.indexOf('card was declined'));
              assert(err.fields.length === 1);
              assert(err.fields[0] === 'number');
              assert(!token);
              done();
            });
          });
        });
      });

      describe('when given an invalid cvv', () => {
        var example = merge(clone(valid), {
          cvv: 'blah'
        });

        it('produces a validation error', done => {
          builder(example, example => {
            recurly.token(example, (err, token) => {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(err.fields[0] === 'cvv');
              assert(!token);
              done();
            });
          });
        });
      });

      describe('when given valid values', () => {
        var examples = [
          valid,
          merge(clone(valid), {
            cvv: ''
          }),
          merge(clone(valid), {
            address1: '400 Alabama St.',
            address2: 'Suite 202',
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94110',
            phone: '1-844-732-8759'
          })
        ];

        it('yields a token', done => {
          var part = after(examples.length, done);

          examples.forEach(example => {
            builder(example, example => {
              recurly.token(example, (err, token) => {
                assert(!err);
                assert(token.id);
                part();
              });
            });
          });
        });

        it('sets the value of a data-recurly="token" field', done => {
          var part = after(examples.length, done);

          examples.forEach(example => {
            builder(example, example => {
              recurly.token(example, (err, token) => {
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

      describe('when given additional required fields', () => {
        beforeEach(() => {
          recurly = new Recurly();
          recurly.configure({
            publicKey: 'test',
            api: '//' + window.location.host,
            cors: requestMethod === 'cors',
            required: ['country', 'postal_code', 'unrelated_configured_field']
          });
        });

        describe('when given a blank required value', () => {
          var examples = [
            merge(clone(valid), {
              country: '',
              postal_code: '98765'
            }),
            merge(clone(valid), {
              country: '',
              postal_code: '98765',
              unrelated_configured_field: ''
            })
          ];

          it('produces a validation error', done => {
            var part = after(examples.length, done);

            examples.forEach(example => {
              builder(example, example => {
                recurly.token(example, (err, token) => {
                  assert(err.code === 'validation');
                  assert(err.fields.length === 1);
                  assert(~err.fields.indexOf('country'));
                  assert(!~err.fields.indexOf('postal_code'));
                  assert(!~err.fields.indexOf('unrelated_configured_field'));
                  assert(!token);
                  part();
                });
              });
            });
          });
        });
      });
    };
  });
});
