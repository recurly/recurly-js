var assert = require('component/assert');
var index = require('component/indexof');
var clone = require('component/clone');
var each = require('component/each');
var noop = require('chrissrogers/noop');
var after = require('segmentio/after');
var merge = require('yields/merge');
var helpers = require('./support/helpers');

helpers.apiTest(function (requestMethod) {
  describe('Recurly.token (' + requestMethod + ')', function () {
    var Recurly = window.recurly.Recurly;
    var recurly;
    var valid = {
      number: '4111111111111111',
      month: '01',
      year: new Date().getFullYear() + 1,
      first_name: 'foo',
      last_name: 'bar'
    };

    beforeEach(function () {
      recurly = new Recurly();
      recurly.configure({
        publicKey: 'test',
        api: '//' + window.location.host,
        cors: requestMethod === 'cors'
      });
    });

    it('requires a callback', function () {
      try {
        recurly.token(valid);
      } catch (e) {
        assert(~e.message.indexOf('callback'));
      }
    });

    it('requires Recurly.configure', function () {
      try {
        recurly = new Recurly();
        recurly.token(valid, noop);
      } catch (e) {
        assert(~e.message.indexOf('configure'));
      }
    });

    describe('when called with a plain object', function () {
      tokenSuite(function (values, runner) {
        return runner(values);
      });
    });

    describe('when called with an HTMLFormElement', function () {
      tokenSuite(function (values, runner) {
        helpers.domTest(function (testbed, done) {
          testbed.insertAdjacentHTML('beforeend',
            ' <form id="test-form"> ' +
            '   <input type="text" data-recurly="number" value="' + (values.number || '') + '"> ' +
            '   <input type="text" data-recurly="month" value="' + (values.month || '') + '"> ' +
            '   <input type="text" data-recurly="year" value="' + (values.year || '') + '"> ' +
            '   <input type="text" data-recurly="cvv" value="' + (values.cvv || '') + '"> ' +
            '   <input type="text" data-recurly="first_name" value="' + (values.first_name || '') + '"> ' +
            '   <input type="text" data-recurly="last_name" value="' + (values.last_name || '') + '"> ' +
            '   <input type="text" data-recurly="address1" value="' + (values.address1 || '') + '"> ' +
            '   <input type="text" data-recurly="address2" value="' + (values.address2 || '') + '"> ' +
            '   <input type="text" data-recurly="city" value="' + (values.city || '') + '"> ' +
            '   <input type="text" data-recurly="state" value="' + (values.state || '') + '"> ' +
            '   <input type="text" data-recurly="postal_code" value="' + (values.last_name || '') + '"> ' +
            '   <input type="text" data-recurly="phone" value="' + (values.phone || '') + '"> ' +
            '   <input type="text" data-recurly="vat_number" value="' + (values.vat_number || '') + '"> ' +
            '   <input type="text" data-recurly="country" value="' + (values.country || '') + '"> ' +
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
      describe('when given an invalid card number', function () {
        var example = merge(clone(valid), {
          number: '4111111111111112'
        });

        it('produces a validation error', function (done) {
          builder(example, function (example) {
            recurly.token(example, function (err, token) {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(err.fields[0] === 'number');
              assert(!token);
              done();
            });
          });
        });
      });

      describe('when given an invalid expiration', function () {
        var example = merge(clone(valid), {
          year: new Date().getFullYear() - 1
        });

        it('produces a validation error', function (done) {
          builder(example, function (example) {
            recurly.token(example, function (err, token) {
              assert(err.code === 'validation');
              assert(err.fields.length === 2);
              assert(~index(err.fields, 'month'));
              assert(~index(err.fields, 'year'));
              assert(!token);
              done();
            });
          });
        });
      });

      describe('when given a blank value', function () {
        var example = merge(clone(valid), {
          first_name: ''
        });

        it('produces a validation error', function (done) {
          builder(example, function (example) {
            recurly.token(example, function (err, token) {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(err.fields[0] === 'first_name');
              assert(!token);
              done();
            });
          });
        });
      });

      describe('when given a declining card', function () {
        var example = merge(clone(valid), {
          number: '4000000000000002'
        });

        it('produces a validation error', function (done) {
          builder(example, function (example) {
            recurly.token(example, function (err, token) {
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

      describe('when given an invalid cvv', function () {
        var example = merge(clone(valid), {
          cvv: 'blah'
        });

        it('produces a validation error', function (done) {
          builder(example, function (example) {
            recurly.token(example, function (err, token) {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(err.fields[0] === 'cvv');
              assert(!token);
              done();
            });
          });
        });
      });

      describe('when given valid values', function () {
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

        it('yields a token', function (done) {
          var part = after(examples.length, done);

          each(examples, function (example) {
            builder(example, function (example) {
              recurly.token(example, function (err, token) {
                assert(!err);
                assert(token.id);
                part();
              });
            });
          });
        });

        it('sets the value of a data-recurly="token" field', function (done) {
          var part = after(examples.length, done);

          each(examples, function (example) {
            builder(example, function (example) {
              recurly.token(example, function (err, token) {
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

      describe('when given additional required fields', function () {
        beforeEach(function () {
          recurly = new Recurly();
          recurly.configure({
            publicKey: 'test',
            api: '//' + window.location.host,
            cors: requestMethod === 'cors',
            required: ['country', 'postal_code', 'unrelated_configured_field']
          });
        });

        describe('when given a blank required value', function () {
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

          it('produces a validation error', function (done) {
            var part = after(examples.length, done);

            each(examples, function (example) {
              builder(example, function (example) {
                recurly.token(example, function (err, token) {
                  assert(err.code === 'validation');
                  assert(err.fields.length === 1);
                  assert(~index(err.fields, 'country'));
                  assert(!~index(err.fields, 'postal_code'));
                  assert(!~index(err.fields, 'unrelated_configured_field'));
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
