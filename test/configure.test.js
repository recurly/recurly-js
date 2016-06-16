import assert from 'assert';
import each from 'lodash.foreach';
import after from 'lodash.after';
import {fixture} from './support/fixtures';
import {Recurly} from '../lib/recurly';

describe('Recurly.configure', function () {
  let recurly;

  beforeEach(function () {
    if (this.currentTest.ctx.fixture) fixture(this.currentTest.ctx.fixture);
    recurly = new Recurly;
  });

  describe('when options.publicKey is not given', function () {
    var examples = [
        {}
      , { invalid: 'parameter' }
      , { currency: 'USD' }
      , { currency: 'AUD', api: 'https://localhost' }
      , { currency: 'USD', api: 'https://localhost', required: ['postal_code'] }
    ];

    it('throws', function () {
      examples.forEach((opts) => {
        assert.throws(recurly.configure.bind(recurly, opts));
      });
    });

    it('Recurly.configured remains false', function () {
      examples.forEach((opts) => {
        try {
          recurly.configure(opts);
        } catch (e) {
          assert(recurly.configured === false);
        }
      });
    });
  });

  describe('when options.publicKey is given', function () {
    var examples = [
        { publicKey: 'foo' }
      , { publicKey: 'foo', currency: 'USD' }
      , { publicKey: 'foo', currency: 'AUD', api: 'https://localhost' }
      , { publicKey: 'foo', currency: 'AUD', api: 'https://localhost', cors: true }
      , { publicKey: 'foo', currency: 'USD', api: 'https://localhost', required: ['country'] }
      , { publicKey: 'foo', currency: 'USD', api: 'https://localhost', required: ['postal_code', 'country'] }
    ];

    it('sets Recurly.config to the options given', function () {
      examples.forEach((opts) => {
        var recurly = new Recurly;
        recurly.configure(opts);
        each(opts, (val, opt) => assert(recurly.config[opt] === val));
      });
    });

    it('sets default values for options not given', function () {
      examples.forEach(function (opts) {
        var recurly = new Recurly();
        recurly.configure(opts);
        each(recurly.config, (val, opt) => {
          if (opts[opt]) {
            assert(opts[opt] === val);
          } else {
            assert(val !== undefined);
            assert(val !== opts[opt]);
          }
        });
      });
    });

    describe('when options.api is given', function () {
      it('sets Recurly.config.api to the given api', function () {
        recurly.configure({ publicKey: 'foo', api: 'http://localhost' });
        assert(recurly.config.api === 'http://localhost');
      });
    });

    describe('when options.cors is given', function () {
      it('sets Recurly.config.cors to the given value', function () {
        recurly.configure({ publicKey: 'foo', cors: true });
        assert(recurly.config.cors === true);
      });
    });

    describe('as a string parameter', function () {
      it('sets the publicKey', function () {
        recurly.configure('bar');
        assert(recurly.config.publicKey === 'bar');
      });
    });
  });

  describe('when falsey options are given', function () {
    var examples = [0, '', null, false, undefined];

    it('sets default values instead', function () {
      examples.forEach(function (falsey) {
        var recurly = new Recurly();

        recurly.configure({
          publicKey: 'foo',
          currency: falsey,
          api: falsey,
          timeout: falsey,
          cors: falsey
        });

        assert(recurly.config.currency === 'USD');
        assert(recurly.config.timeout === 60000);
        assert(recurly.config.api === 'https://api.recurly.com/js/v1');
      });
    });
  });

  describe('when reconfiguring', function () {
    this.ctx.fixture = 'multipleForms';

    it('resets and reinstantiates', function (done) {
      let party = after(4, done);;
      let part = function (log) {
        party();
        console.log(log)
      }

      recurly.configure({
        publicKey: 'foo',
        fields: {
          number: '#number-1',
          month: '#month-1',
          year: '#year-1',
          cvv: '#cvv-1'
        }
      });
      assert(recurly.configured === true);
      recurly.ready(() => {
        assert(document.querySelector('#number-1 iframe') instanceof HTMLElement);
        part('1');
      });
      recurly.ready(() => {
        assert(document.querySelector('#number-2 iframe') === null);
        part('2');
      });

      recurly.configure({
        publicKey: 'bar',
        fields: {
          number: '#number-2',
          month: '#month-2',
          year: '#year-2',
          cvv: '#cvv-2'
        }
      });
      assert(recurly.configured === true);
      console.log(`my readyState: ${recurly.readyState}`);
      recurly.ready(() => {
        assert(document.querySelector('#number-1 iframe') === null);
        part('3');
      });
      recurly.ready(() => {
        assert(document.querySelector('#number-2 iframe') instanceof HTMLElement);
        part('4');
      });
    });
  });
});
