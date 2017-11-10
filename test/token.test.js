import assert from 'assert';
import after from 'lodash.after';
import merge from 'lodash.merge';
import each from 'lodash.foreach';
import clone from 'component-clone';
import {Recurly} from '../lib/recurly';
import {applyFixtures} from './support/fixtures';
import {initRecurly, apiTest, domTest} from './support/helpers';

apiTest(requestMethod => {
  describe(`Recurly.token (${requestMethod})`, function () {
    const valid = {
      number: '4111111111111111',
      month: '01',
      year: new Date().getFullYear() + 1,
      first_name: 'foo',
      last_name: 'bar'
    };

    applyFixtures();

    beforeEach(function (done) {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.recurly.ready(() => done());
    });

    describe('without markup', function () {
      it('requires a callback', function () {
        try {
          this.recurly.token(clone(valid));
        } catch (e) {
          assert(~e.message.indexOf('callback'));
        }
      });

      it('requires Recurly.configure', function () {
        try {
          let recurly = new Recurly();
          recurly.token(clone(valid), () => {});
        } catch (e) {
          assert(~e.message.indexOf('configure'));
        }
      });
    });

    describe('when using minimal markup', function () {
      this.ctx.fixture = 'minimal';

      describe('when called with a plain object', function () {
        tokenSuite(plainObjectBuilder);
      });
      describe('when called with an HTMLFormElement', function () {
        tokenSuite(formBuilder);
      });
    });

    describe('when using all markup', function () {
      this.ctx.fixture = 'all';

      describe('when called with a plain object', function () {
        tokenSuite(plainObjectBuilder);
        tokenAllMarkupSuite(plainObjectBuilder);
      });
      describe('when called with an HTMLFormElement', function () {
        tokenSuite(formBuilder);
        tokenAllMarkupSuite(formBuilder);
      });
    });

    function tokenSuite (builder) {
      describe('when given an invalid card number', function () {
        let example = merge(clone(valid), {
          number: '4111111111111112'
        });

        it('produces a validation error', function (done) {
          this.recurly.token(builder(example), (err, token) => {
            assert(err.code === 'validation');
            assert(err.fields.length === 1);
            assert(err.fields[0] === 'number');
            assert(!token);
            done();
          });
        });
      });

      describe('when given an invalid expiration', function () {
        let example = merge(clone(valid), {
          year: new Date().getFullYear() - 1
        });

        it('produces a validation error', function (done) {
          this.recurly.token(builder(example), (err, token) => {
            assert(err.code === 'validation');
            assert(err.fields.length === 2);
            assert(~err.fields.indexOf('month'));
            assert(~err.fields.indexOf('year'));
            assert(!token);
            done();
          });
        });
      });

      describe('when given a blank value', function () {
        let example = merge(clone(valid), {
          first_name: ''
        });

        it('produces a validation error', function (done) {
          this.recurly.token(builder(example), (err, token) => {
            assert(err.code === 'validation');
            assert(err.fields.length === 1);
            assert(err.fields[0] === 'first_name');
            assert(!token);
            done();
          });
        });
      });

      describe('when given a declining card', function () {
        let example = merge(clone(valid), {
          number: '4000000000000002'
        });

        it('produces a validation error', function (done) {
          this.recurly.token(builder(example), (err, token) => {
            assert(err.code === 'declined');
            assert(err.message.indexOf('card was declined'));
            assert(err.fields.length === 1);
            assert(err.fields[0] === 'number');
            assert(!token);
            done();
          });
        });
      });

      if(requestMethod === 'cors') {
        describe('when given an invalid json response', function () {
          let example = merge(clone(valid), {
            number: '5454545454545454'
          });

          it('produces an api-error with the raw responseText', function (done) {
            this.recurly.token(builder(example), (err, token) => {
              assert(!token);
              assert(err.code === 'api-error');
              assert(err.message.indexOf('problem parsing the API response with: some json that cannot be parsed'));
              done();
            });
          });
        });
      }

      describe('when given an invalid cvv', function () {
        let example = merge(clone(valid), { cvv: 'blah' });

        it('produces a validation error', function (done) {
          this.recurly.token(builder(example), (err, token) => {
            assert(err.code === 'validation');
            assert(err.fields.length === 1);
            assert(err.fields[0] === 'cvv');
            assert(!token);
            done();
          });
        });
      });

      describe('when given valid values', function () {
        let examples = [
          valid,
          merge(clone(valid), { cvv: '' }),
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
          let part = after(examples.length, done);

          examples.forEach(example => {
            this.recurly.token(builder(example), (err, token) => {
              assert(!err);
              assert(token.id);
              part();
            });
          });
        });

        it('sets the value of a data-recurly="token" field', function (done) {
          let part = after(examples.length, done);

          examples.forEach(example => {
            this.recurly.token(builder(example), (err, token) => {
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

      describe('when kount fraud options are enabled', function () {
        beforeEach(function (done) {
          this.recurly = initRecurly({
            cors: requestMethod === 'cors',
            fraud: {
              kount: { dataCollector: true }
            }
          });
          this.recurly.ready(() => {
            sinon.spy(this.recurly.bus, 'send');
            done();
          });
        });

        it('sends a fraud session id and yields a token', function (done) {
          const example = merge(clone(valid), { fraud_session_id: '9a87s6dfaso978ljk' });
          this.recurly.fraud.on('ready', () => {
            this.recurly.token(builder(example), (err, token) => {
              const spy = this.recurly.bus.send.withArgs('token:init');
              assert(spy.calledOnce);
              assert(spy.firstCall.args[1].inputs.fraud.length === 1);
              assert(spy.firstCall.args[1].inputs.fraud[0].processor === 'kount');
              assert(spy.firstCall.args[1].inputs.fraud[0].session_id === '9a87s6dfaso978ljk');
              assert(!err);
              assert(token);
              done();
            });
          });
        });
      });

      describe('when litle fraud options are enabled', function () {
        beforeEach(function (done) {
          this.recurly = initRecurly({
            cors: requestMethod === 'cors',
            fraud: {
              litle: { sessionId: '123456' }
            }
          });
          this.recurly.ready(() => {
            sinon.spy(this.recurly.bus, 'send');
            done();
          });
        });

        it('sends a fraud session id and yields a token', function (done) {
          const example = merge(clone(valid), { fraud_session_id: '123456' });
          this.recurly.token(builder(example), (err, token) => {
            const spy = this.recurly.bus.send.withArgs('token:init');
            assert(spy.calledOnce);
            assert(spy.firstCall.args[1].inputs.fraud.length === 1);
            assert(spy.firstCall.args[1].inputs.fraud[0].processor === 'litle_threat_metrix');
            assert(spy.firstCall.args[1].inputs.fraud[0].session_id === '123456');
            assert(!err);
            assert(token);
            done();
          });
        });
      });

      describe('when cvv is specifically required', function () {
        beforeEach(function (done) {
          this.recurly = initRecurly({
            cors: requestMethod === 'cors',
            required: ['cvv']
          });
          this.recurly.ready(done);
        });

        describe('when cvv is blank', function () {
          it('produces a validation error', function (done) {
            const example = merge(clone(valid), { cvv: '' });

            this.recurly.token(builder(example), (err, token) => {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(~err.fields.indexOf('cvv'));
              assert(!token);
              done();
            });
          });
        });

        describe('when cvv is invalid', function () {
          it('produces a validation error', function (done) {
            const example = merge(clone(valid), { cvv: '23783564' });

            this.recurly.token(builder(example), (err, token) => {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(~err.fields.indexOf('cvv'));
              assert(!token);
              done();
            });
          });
        });

        describe('when cvv is valid', function () {
          it('yields a token', function (done) {
            const example = merge(clone(valid), { cvv: '123' });

            this.recurly.token(builder(example), (err, token) => {
              assert(!err);
              assert(token);
              done();
            });
          });
        });
      });
    }

    function tokenAllMarkupSuite (builder) {
      describe('when given additional required fields', function () {
        beforeEach(function (done) {
          this.recurly = initRecurly({
            cors: requestMethod === 'cors',
            required: ['country', 'postal_code', 'unrelated_configured_field']
          });
          this.recurly.ready(done);
        });

        describe('when given a blank required value', function () {
          let examples = [
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
            let part = after(examples.length, done);

            examples.forEach(example => {
              this.recurly.token(builder(example), (err, token) => {
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

          it('produces a validation error', function (done) {
            var example = merge(clone(valid), {
              country: 'US',
              postal_code: ''
            });

            this.recurly.token(builder(example), (err, token) => {
              assert(err.code === 'validation');
              assert(err.fields.length === 1);
              assert(~err.fields.indexOf('postal_code'));
              assert(!~err.fields.indexOf('country'));
              assert(!token);
              done();
            });
          });
        });
      });
    }

    // For each example, updates corresponding hosted fields and returns all others
    function plainObjectBuilder (example) {
      example = clone(example);
      const form = global.document.querySelector('#test-form');
      each(example, (val, key) => {
        let el = form.querySelector(`[data-recurly=${key}]`);
        if (el instanceof HTMLDivElement) {
          el.querySelector('iframe').contentWindow.value(val);
          delete example[key];
        }
      });
      return example;
    }

    // For each example, updates corresponding input filds or hosted fields
    function formBuilder (example) {
      const form = global.document.querySelector('#test-form');
      each(example, (val, key) => {
        let el = form.querySelector(`[data-recurly=${key}]`);
        if (el instanceof HTMLDivElement) {
          el.querySelector('iframe').contentWindow.value(val);
        } else if (el && 'value' in el) {
          el.value = val;
        }
      });
      return form;
    }
  });
});
