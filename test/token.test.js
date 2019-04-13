import assert from 'assert';
import after from 'lodash.after';
import merge from 'lodash.merge';
import each from 'lodash.foreach';
import clone from 'component-clone';
import Promise from 'promise';
import { Recurly } from '../lib/recurly';
import { applyFixtures } from './support/fixtures';
import { initRecurly, apiTest } from './support/helpers';

apiTest(requestMethod => {
  describe(`Recurly.token (${requestMethod})`, function () {
    // Some of these tests can take a while to stand up fields and receive reponses
    this.timeout(15000);

    const valid = {
      number: '4111111111111111',
      month: '01',
      year: new Date().getFullYear() + 1,
      first_name: 'foo',
      last_name: 'bar'
    };

    const elementsMap = {
      card: 'CardElement',
      number: 'CardNumberElement',
      month: 'CardMonthElement',
      year: 'CardYearElement',
      cvv: 'CardCvvElement'
    };

    applyFixtures();

    beforeEach(function (done) {
      this.recurly = initRecurly({ cors: requestMethod === 'cors' });
      this.recurly.ready(() => done());
    });

    afterEach(function () {
      this.recurly.destroy();
    });
    /**
     * For each example, updates corresponding hosted fields and returns all others
     */
    function plainObjectBuilder (example) {
      example = clone(example);
      const form = window.document.querySelector('#test-form');

      Object.keys(example).forEach(key => {
        const val = example[key];
        const el = form.querySelector(`[data-recurly=${key}]`);
        if (el instanceof HTMLDivElement) {
          el.querySelector('iframe').contentWindow.value(val);
          delete example[key];
        }
      });

      return Promise.resolve({ tokenArgs: [example], tokenBus: this.recurly.bus });
    }

    /**
     * For each example, updates corresponding input field or hosted field
     */
    function formBuilder (example) {
      const form = window.document.querySelector('#test-form');

      Object.keys(example).forEach(key => {
        const val = example[key];
        const el = form.querySelector(`[data-recurly=${key}]`);
        if (el instanceof HTMLDivElement) {
          el.querySelector('iframe').contentWindow.value(val);
        } else if (el && 'value' in el) {
          el.value = val;
        }
      });

      return Promise.resolve({ tokenArgs: [form], tokenBus: this.recurly.bus });
    }

    /**
     * For each example, updates corresponding input field or Element
     */
    function elementsBuilder (example) {
      const form = window.document.querySelector('#test-form');
      const container = form.querySelector(`#recurly-elements`);
      const elements = this.elements = this.recurly.Elements();

      return Promise.all(Object.keys(example).map(key => {
        const val = example[key];
        let el = form.querySelector(`[data-recurly=${key}]`);

        return new Promise((resolve, reject) => {
          if (el && 'value' in el) {
            el.value = val;
            resolve();
          } else {
            const elementClass = elementsMap[key];
            if (!elementClass) return resolve();

            const element = elements[elementClass]();
            element.on('attach', () => {
              element.iframe.contentWindow.value(val);
              resolve();
            });
            element.attach(container);
          }
        });
      })).then(() => ({ tokenArgs: [elements, form], tokenBus: elements.bus }));
    }

    /**
     * Resolves immediately with the given example
     */
    function embeddedBuilder (example) {
      return Promise.resolve({ tokenArgs: [example], tokenBus: this.recurly.bus });
    }

    describe('without markup', function () {
      it('requires a callback', function () {
        assert.throws(() => this.recurly.token(clone(valid)), /callback/);
      });

      it('requires Recurly.configure', function () {
        const recurly = new Recurly();
        assert.throws(() => recurly.token(clone(valid), () => {}), /configure/);
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

      describe('when called with an Elements instance', function () {
        this.ctx.fixture = 'elements';

        tokenSuite(elementsBuilder);
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

    describe('when behaving as an element/hosted field', function () {
      this.ctx.fixture = 'minimal';

      beforeEach(function () {
        this.recurly.config.parent = false;
      });

      tokenSuite(embeddedBuilder);
    });

    /**
     * Applies a series of standard expectations for tokenization, accepting
     * a function that sets up the example and subject beforehand
     *
     * @param {Function} builder callback function. Must return a promise resolving to the example
     */
    function tokenSuite (builder) {
      describe('when given an invalid card number', function () {
        prepareExample(Object.assign({}, valid, {
          number: '4111111111111112'
        }), builder);

        it('produces a validation error', function (done) {
          this.subject((err, token) => {
            assert.strictEqual(err.code, 'validation');
            assert.strictEqual(err.fields.length, 1);
            assert.strictEqual(err.fields[0], 'number');
            assert.strictEqual(err.details.length, 1);
            assert.strictEqual(err.details[0].field, 'number');
            assert.strictEqual(err.details[0].messages.length, 1);
            assert.strictEqual(err.details[0].messages[0], 'is invalid');
            assert(!token);
            done();
          });
        });
      });

      describe('when given an invalid expiration', function () {
        prepareExample(Object.assign({}, valid, {
          year: new Date().getFullYear() - 1
        }), builder);

        it('produces a validation error', function (done) {
          this.subject((err, token) => {
            assert.strictEqual(err.code, 'validation');
            assert.strictEqual(err.fields.length, 2);
            assert(~err.fields.indexOf('month'));
            assert(~err.fields.indexOf('year'));
            assert.strictEqual(err.details.length, 2);
            assert.strictEqual(err.details[0].field, 'month');
            assert.strictEqual(err.details[0].messages.length, 1);
            assert.strictEqual(err.details[0].messages[0], 'is invalid');
            assert.strictEqual(err.details[1].field, 'year');
            assert.strictEqual(err.details[1].messages.length, 1);
            assert.strictEqual(err.details[1].messages[0], 'is invalid');
            assert(!token);
            done();
          });
        });
      });

      describe('when given a blank value', function () {
        prepareExample(Object.assign({}, valid, {
          first_name: ''
        }), builder);

        it('produces a validation error', function (done) {
          this.subject((err, token) => {
            assert.strictEqual(err.code, 'validation');
            assert.strictEqual(err.fields.length, 1);
            assert.strictEqual(err.fields[0], 'first_name');
            assert.strictEqual(err.details.length, 1);
            assert.strictEqual(err.details[0].field, 'first_name');
            assert.strictEqual(err.details[0].messages.length, 1);
            assert.strictEqual(err.details[0].messages[0], "can't be blank");
            assert(!token);
            done();
          });
        });
      });

      describe('when given a declining card', function () {
        prepareExample(Object.assign({}, valid, {
          number: '4000000000000002'
        }), builder);

        it('produces a validation error', function (done) {
          this.subject((err, token) => {
            assert.strictEqual(err.code, 'declined');
            assert(err.message.indexOf('card was declined'));
            assert.strictEqual(err.fields.length, 1);
            assert.strictEqual(err.fields[0], 'number');
            assert.strictEqual(err.details.length, 1);
            assert.strictEqual(err.details[0].field, 'number');
            assert.strictEqual(err.details[0].messages.length, 1);
            assert(err.details[0].messages[0].indexOf('card was declined'));
            assert(!token);
            done();
          });
        });
      });

      if (requestMethod === 'cors') {
        describe('when given an invalid json response', function () {
          prepareExample(Object.assign({}, valid, {
            number: '5454545454545454'
          }), builder);

          it('produces an api-error with the raw responseText', function (done) {
            this.subject((err, token) => {
              assert(!token);
              assert.strictEqual(err.code, 'api-error');
              assert(err.message.indexOf('problem parsing the API response with: some json that cannot be parsed'));
              done();
            });
          });
        });
      }

      describe('when given an invalid cvv', function () {
        prepareExample(Object.assign({}, valid, {
          cvv: 'blah'
        }), builder);

        it('produces a validation error', function (done) {
          this.subject((err, token) => {
            assert.strictEqual(err.code, 'validation');
            assert.strictEqual(err.fields.length, 1);
            assert.strictEqual(err.fields[0], 'cvv');
            assert.strictEqual(err.details.length, 1);
            assert.strictEqual(err.details[0].field, 'cvv');
            assert.strictEqual(err.details[0].messages.length, 1);
            assert.strictEqual(err.details[0].messages[0], 'is invalid');
            assert(!token);
            done();
          });
        });
      });

      describe('when given valid values', function () {
        const examples = {
          'basic valid values': valid,
          'a blank cvv': Object.assign({}, valid, { cvv: '' }),
          'a full address': Object.assign({}, valid, {
            address1: '400 Alabama St.',
            address2: 'Suite 202',
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94110',
            phone: '1-844-732-8759'
          })
        };

        Object.keys(examples).forEach(description => {
          const example = examples[description];
          describe(`when given ${description}`, function () {
            prepareExample(example, builder);

            it('yields a token', function (done) {
              this.subject((err, token) => {
                assert(!err);
                assert(token.id);
                done();
              });
            });

            it('sets the value of a data-recurly="token" field', function (done) {
              this.subject((err, token) => {
                assert(!err);
                assert(token.id);
                if (example && example.nodeType === 3) {
                  assert(example.querySelector('[data-recurly=token]').value === token.id);
                }
                done();
              });
            });
          });
        });
      });

      describe('when kount fraud options are enabled', function () {
        beforeEach(function (done) {
          // This test is to be performed on parents only
          if (!this.recurly.isParent) return done();
          this.recurly = initRecurly({
            cors: this.recurly.config.cors,
            fraud: {
              kount: {
                dataCollector: true,
                form: document.querySelector('#test-form')
              }
            }
          });
          const part = after(2, () => done());
          this.recurly.ready(part);
          this.recurly.fraud.on('ready', part);
        });

        prepareExample(Object.assign({}, valid, {
          fraud_session_id: '9a87s6dfaso978ljk'
        }), builder);

        it('sends a fraud session id and yields a token', function (done) {
          // This test is to be performed on parents only
          if (!this.recurly.isParent) return done();
          this.subject((err, token) => {
            const spy = this.tokenBus.send.withArgs('token:init');
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

      describe('when litle fraud options are enabled', function () {
        beforeEach(function () {
          this.recurly.configure({
            fraud: {
              litle: { sessionId: '123456' }
            }
          });
        });

        prepareExample(Object.assign({}, valid, {
          fraud_session_id: '123456'
        }), builder);

        it('sends a fraud session id and yields a token', function (done) {
          // This test is to be performed on parents only
          if (!this.recurly.isParent) return done();
          this.subject((err, token) => {
            const spy = this.tokenBus.send.withArgs('token:init');
            assert(spy.calledOnce);
            assert.strictEqual(spy.firstCall.args[1].inputs.fraud.length, 1);
            assert.strictEqual(spy.firstCall.args[1].inputs.fraud[0].processor, 'litle_threat_metrix');
            assert.strictEqual(spy.firstCall.args[1].inputs.fraud[0].session_id, '123456');
            assert(!err);
            assert(token);
            done();
          });
        });
      });

      describe('when cvv is specifically required', function () {
        beforeEach(function () {
          this.recurly.configure({ required: ['cvv'] });
        });

        describe('when cvv is blank', function () {
          prepareExample(Object.assign({}, valid, {
            cvv: ''
          }), builder);
          it('produces a validation error', function (done) {
            this.subject((err, token) => {
              assert.strictEqual(err.code, 'validation');
              assert.strictEqual(err.fields.length, 1);
              assert(~err.fields.indexOf('cvv'));
              assert.strictEqual(err.details.length, 1);
              assert.strictEqual(err.details[0].field, 'cvv');
              assert.strictEqual(err.details[0].messages.length, 1);
              assert.strictEqual(err.details[0].messages[0], "can't be blank");
              assert(!token);
              done();
            });
          });
        });

        describe('when cvv is invalid', function () {
          prepareExample(Object.assign({}, valid, {
            cvv: '23783564'
          }), builder);

          it('produces a validation error', function (done) {
            this.subject((err, token) => {
              assert.strictEqual(err.code, 'validation');
              assert.strictEqual(err.fields.length, 1);
              assert(~err.fields.indexOf('cvv'));
              assert.strictEqual(err.details.length, 1);
              assert.strictEqual(err.details[0].field, 'cvv');
              assert.strictEqual(err.details[0].messages.length, 1);
              assert.strictEqual(err.details[0].messages[0], 'is invalid');
              assert(!token);
              done();
            });
          });
        });

        describe('when cvv is valid', function () {
          prepareExample(Object.assign({}, valid, {
            cvv: '123'
          }), builder);

          it('yields a token', function (done) {
            this.subject((err, token) => {
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
          const examples = {
            'a blank country': Object.assign({}, valid, {
              country: '',
              postal_code: '98765'
            }),
            'a blank country and unrelated field': Object.assign({}, valid, {
              country: '',
              postal_code: '98765',
              unrelated_configured_field: ''
            })
          };

          Object.keys(examples).forEach(description => {
            const example = examples[description];
            describe(`when given ${description}`, function () {
              prepareExample(example, builder);

              it('produces a validation error', function (done) {
                this.subject((err, token) => {
                  assert(err.code === 'validation');
                  assert(err.fields.length === 1);
                  assert(~err.fields.indexOf('country'));
                  assert(!~err.fields.indexOf('postal_code'));
                  assert(!~err.fields.indexOf('unrelated_configured_field'));
                  assert.strictEqual(err.details.length, 1);
                  assert.strictEqual(err.details[0].field, 'country');
                  assert.strictEqual(err.details[0].messages.length, 1);
                  assert.strictEqual(err.details[0].messages[0], "can't be blank");
                  assert(!token);
                  done();
                });
              });
            })
          });

          describe('when given a blank postal_code', function () {
            prepareExample(Object.assign({}, valid, {
              country: 'US',
              postal_code: ''
            }), builder);

            it('produces a validation error', function (done) {
              this.subject((err, token) => {
                assert(err.code === 'validation');
                assert(err.fields.length === 1);
                assert(~err.fields.indexOf('postal_code'));
                assert(!~err.fields.indexOf('country'));
                assert.strictEqual(err.details.length, 1);
                assert.strictEqual(err.details[0].field, 'postal_code');
                assert.strictEqual(err.details[0].messages.length, 1);
                assert.strictEqual(err.details[0].messages[0], "can't be blank");
                assert(!token);
                done();
              });
            });
          });
        });
      });
    }

    function prepareExample (options = {}, builder) {
      beforeEach(function (done) {
        builder.call(this, options).then(example => {
          this.subject = cb => this.recurly.token.apply(this.recurly, example.tokenArgs.concat(cb));
          this.tokenBus = example.tokenBus;
          sinon.spy(this.tokenBus, 'send');
          done();
        }).done();
      });

      afterEach(function () {
        this.tokenBus.send.restore();
      });
    }
  });
});
