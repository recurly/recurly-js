var assert = require('component/assert');
var each = require('component/each');
var bind = require('component/bind');

describe('Recurly.configure', function () {
  var Recurly = window.recurly.Recurly;
  var recurly;

  beforeEach(function () {
    recurly = new Recurly();
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
      each(examples, function (opts) {
        assert.throws(bind(recurly, recurly.configure, opts));
      });
    });

    it('Recurly.configured remains false', function () {
      each(examples, function (opts) {
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
      each(examples, function (opts) {
        var recurly = new Recurly();
        recurly.configure(opts);
        each(opts, function (opt, val) {
          assert(recurly.config[opt] === val);
        });
      });
    });

    it('sets default values for options not given', function () {
      each(examples, function (opts) {
        var recurly = new Recurly();
        recurly.configure(opts);
        each(recurly.config, function (option, val) {
          if (opts[option]) {
            assert(opts[option] === val);
          } else {
            assert(val !== undefined);
            assert(val !== opts[option]);
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
  });

  describe('when falsey options are given', function () {
    var examples = [0, '', null, false, undefined];

    it('sets default values instead', function () {
      each(examples, function (falsey) {
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
});
