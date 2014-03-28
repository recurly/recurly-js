
var assert = require('assert');
var each = require('each');
var bind = require('bind');
var sinon = require('sinon');

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
  });
});
