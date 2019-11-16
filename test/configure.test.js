import each from 'lodash.foreach';
import clone from 'component-clone';
import assert from 'assert';
import combinations from 'combinations';
import { initRecurly, testBed } from './support/helpers';
import { applyFixtures } from './support/fixtures';
import { Recurly } from '../lib/recurly';

describe('Recurly.configure', function () {
  applyFixtures();

  beforeEach(function () {
    this.api = `${window.location.protocol}//${window.location.host}/api`;
    this.recurly = new Recurly();
  });

  describe('when options.publicKey is not given', function () {
    beforeEach(function () {
      const { api } = this;
      this.examples = [
        {},
        { invalid: 'parameter' },
        { currency: 'USD' },
        { currency: 'AUD', api },
        { currency: 'USD', api, required: ['postal_code'] }
      ];
    });

    it('throws', function () {
      const { examples, recurly } = this;
      examples.forEach(opts => {
        assert.throws(recurly.configure.bind(recurly, opts));
      });
    });

    it('Recurly.configured remains false', function () {
      const { examples, recurly } = this;
      examples.forEach(opts => {
        try {
          recurly.configure(opts);
        } catch (e) {
          assert.strictEqual(recurly.configured, false);
        }
      });
    });
  });

  describe('when options.publicKey is given', function () {
    beforeEach(function () {
      const { api } = this;
      this.examples = [
        { publicKey: 'test' },
        { publicKey: 'test', currency: 'USD' },
        { publicKey: 'test', currency: 'AUD', api },
        { publicKey: 'test', currency: 'AUD', api, cors: true },
        { publicKey: 'test', currency: 'USD', api, required: ['country'] },
        { publicKey: 'test', currency: 'USD', api, required: ['postal_code', 'country'] }
      ];
    });

    it('sets Recurly.config to the options given', function () {
      const { examples } = this;
      examples.forEach((opts) => {
        const recurly = new Recurly();
        recurly.configure(opts);
        each(opts, (val, opt) => {
          if (opts[opt]) assert.equal(JSON.stringify(recurly.config[opt]), JSON.stringify(val));
        });
      });
    });

    it('sets default values for options not given', function () {
      const { examples } = this;
      examples.forEach(opts => {
        const recurly = new Recurly();
        recurly.configure(opts);
        each(recurly.config, (val, opt) => {
          if (opts[opt]) {
            assert.equal(JSON.stringify(opts[opt]), JSON.stringify(val));
          } else {
            assert.notStrictEqual(val, undefined);
            assert.notStrictEqual(val, opts[opt]);
          }
        });
      });
    });

    describe('when options.api is given', function () {
      it('sets Recurly.config.api to the given api', function () {
        const { recurly } = this;
        recurly.configure({ publicKey: 'foo', api: 'http://localhost' });
        assert.strictEqual(recurly.config.api, 'http://localhost');
      });
    });

    describe('when options.cors is given', function () {
      it('sets Recurly.config.cors to the given value', function () {
        const { recurly } = this;
        recurly.configure({ publicKey: 'foo', cors: true });
        assert.strictEqual(recurly.config.cors, true);
      });
    });

    describe('as a string parameter', function () {
      it('sets the publicKey', function () {
        const { recurly } = this;
        recurly.configure('bar');
        assert.strictEqual(recurly.config.publicKey, 'bar');
      });
    });
  });

  describe('when options.style is given (deprecated)', function () {
    const { api } = this;
    const example = {
      api,
      publicKey: 'foo',
      style: {
        all: {
          fontFamily: '"Droid Sans", Helvetica, sans-serif',
          fontSize: '20px',
          fontColor: 'green',
          fontWeight: 'bold',
          fontVariant: 'small-caps',
          lineHeight: '1em',
          padding: '5px 8px',
          placeholder: { fontStyle: 'italic' }
        },
        number: {
          color: 'green',
          fontWeight: 'normal',
          placeholder: {
            content: 'Credit Card Number'
          }
        },
        month: {
          placeholder: {
            content: 'Month (mm)'
          }
        },
        year: {
          color: 'persimmon',
          placeholder: {
            content: 'Year (yy)'
          }
        },
        cvv: {
          placeholder: {
            content: 'Security Code',
            color: 'orange !important'
          }
        }
      }
    };

    it('is absent on final configuration', function () {
      const { recurly } = this;
      assert.equal(recurly.config.style, undefined);
    });

    describe('when options.fields is not given', function () {
      it('coerces the given styles into options.fields', function () {
        const { recurly } = this;
        recurly.configure(example);
        assert.deepStrictEqual(recurly.config.fields.number.style, example.style.number);
        assert.deepStrictEqual(recurly.config.fields.month.style, example.style.month);
        assert.deepStrictEqual(recurly.config.fields.year.style, example.style.year);
        assert.deepStrictEqual(recurly.config.fields.cvv.style, example.style.cvv);
        assert.deepStrictEqual(recurly.config.fields.all.style, example.style.all);
      });

      describe('when only options.style.all is set', function () {
        it('sets options.fields.all.style', function () {
          const { recurly } = this;
          const opts = clone(example);
          opts.style = { all: example.style.all };
          recurly.configure(opts);
          assert.deepStrictEqual(recurly.config.fields.all.style, example.style.all);
        });
      });
    });

    describe('when options.fields is given', function () {
      describe('with string values', function () {
        it('coerces the given styles and selectors into options.fields', function () {
          const { recurly } = this;
          const opts = clone(example);
          opts.fields = {
            number: '#custom-number-selector',
            cvv: '#custom-cvv-selector'
          };
          recurly.configure(opts);
          assert.deepStrictEqual(recurly.config.fields.number.style, example.style.number);
          assert.strictEqual(recurly.config.fields.number.selector, '#custom-number-selector');
          assert.strictEqual(recurly.config.fields.cvv.selector, '#custom-cvv-selector');
        });
      });

      describe('with object values', function () {
        let objectExample = clone(example);
        objectExample.fields = {
          number: {
            selector: '#custom-number-selector',
            style: {
              color: 'orangutan',
              placeholder: { content: 'test placeholder content', color: 'plum' }
            },
          }
        };

        it('merges with the object values', function () {
          const { recurly } = this;
          recurly.configure(objectExample);
          const { fields: fieldsConfig } = recurly.config;
          assert.strictEqual(fieldsConfig.number.style.fontWeight, 'normal');
          assert.strictEqual(fieldsConfig.month.style.placeholder.content, 'Month (mm)');
          assert.strictEqual(fieldsConfig.year.style.placeholder.content, 'Year (yy)');
          assert.strictEqual(fieldsConfig.year.style.color, 'persimmon');
          assert.strictEqual(fieldsConfig.cvv.style.placeholder.content, 'Security Code');
          assert.strictEqual(fieldsConfig.cvv.style.placeholder.color, 'orange !important');
        });

        it('does not override the object values', function () {
          const { recurly } = this;
          recurly.configure(objectExample);
          const { fields: fieldsConfig } = recurly.config;
          assert.strictEqual(fieldsConfig.number.selector, '#custom-number-selector');
          assert.strictEqual(fieldsConfig.number.style.color, 'orangutan');
          assert.strictEqual(fieldsConfig.number.style.fontWeight, 'normal');
          assert.strictEqual(fieldsConfig.number.style.placeholder.content, 'test placeholder content');
          assert.strictEqual(fieldsConfig.number.style.placeholder.color, 'plum');
        });
      });
    });
  });

  describe('when falsey options are given', function () {
    beforeEach(function () {
      this.examples = [0, '', null, false, undefined];
    });

    it('sets default values instead', function () {
      const { examples, recurly } = this;
      combinations(examples, examples.length).forEach(falsey => {
        recurly.configure({
          publicKey: 'foo',
          currency: falsey[0],
          api: falsey[1],
          timeout: falsey[2],
          cors: falsey[3],
          fraud: falsey[4]
        });

        assert.strictEqual(recurly.config.currency, 'USD');
        assert.strictEqual(recurly.config.timeout, 60000);
        assert.strictEqual(recurly.config.api, 'https://api.recurly.com/js/v1');
      });
    });
  });

  describe('when reconfiguring field selectors', function () {
    this.ctx.fixture = 'multipleForms';

    it('resets and reinitializes fields on the new targets', function (done) {
      const { recurly } = this;
      const numberOne = testBed().querySelector('#number-1');
      const numberTwo = testBed().querySelector('#number-2');

      configureRecurly(recurly, '1', () => {
        assert.strictEqual(numberOne.children.length, 1);
        assert.strictEqual(numberTwo.children.length, 0);
        assert(numberOne.querySelector('iframe') instanceof HTMLIFrameElement);
        configureRecurly(recurly, '2', () => {
          assert.strictEqual(numberOne.children.length, 0);
          assert.strictEqual(numberTwo.children.length, 1);
          assert(numberTwo.querySelector('iframe') instanceof HTMLIFrameElement);
          done();
        });
      });
    });

    function configureRecurly (recurly, index, done) {
      initRecurly(recurly, {
        fields: {
          number: `#number-${index}`,
          month: `#month-${index}`,
          year: `#year-${index}`,
          cvv: `#cvv-${index}`
        }
      });
      assert.strictEqual(recurly.configured, true);
      setTimeout(recurly.ready(done), 1000);
    }
  });
});
