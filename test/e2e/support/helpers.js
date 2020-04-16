const assert = require('assert');

const TOKEN_PATTERN = /^[\w-]{21,23}$/;
const ELEMENT_TYPES = {
  CardElement: 'CardElement',
  CardNumberElement: 'CardNumberElement',
  CardMonthElement: 'CardMonthElement',
  CardYearElement: 'CardYearElement',
  CardCvvElement: 'CardCvvElement'
};
const FIELD_TYPES = {
  ALL: 'all',
  CARD: 'card',
  NUMBER: 'number',
  MONTH: 'month',
  YEAR: 'year',
  CVV: 'cvv'
};
const TOKEN_TYPES = {
  CREDIT_CARD: 'credit_card',
  PAYPAL: 'paypal',
  BANK_ACCOUNT: 'bank_account',
  IBAN_BANK_ACCOUNT: 'iban_bank_account',
  THREE_D_SECURE_ACTION: 'three_d_secure_action',
  THREE_D_SECURE_ACTION_RESULT: 'three_d_secure_action_result'
};
const CARDS = {
  BLANK: {
    brand: 'unknown',
    number: '',
    formatted: '',
    iconTitle: 'generic_card',
    cvvIconTitle: 'CVV-Generic'
  },
  AMEX: {
    brand: 'american_express',
    number: '372546612345678',
    formatted: '3725 466123 45678',
    iconTitle: 'amex',
    cvvIconTitle: 'CC-Amex'
  },
  DISCOVER: {
    brand: 'discover',
    number: '6011000090139424',
    formatted: '3050 9909 0024 2198',
    iconTitle: 'discover',
    cvvIconTitle: 'CVV-Generic'
  },
  MASTER: {
    brand: 'master',
    number: '5454545454545454',
    formatted: '5454 5454 5454 5454',
    iconTitle: 'mastercard',
    cvvIconTitle: 'CVV-Generic'
  },
  UNION_PAY: {
    brand: 'union_pay',
    number: '6210940011113245',
    formatted: '6210 9400 1111 3245',
    iconTitle: 'union-pay',
    cvvIconTitle: 'CVV-Generic'
  },
  VISA: {
    brand: 'visa',
    number: '4111111111111111',
    formatted: '4111 1111 1111 1111',
    iconTitle: 'visa',
    cvvIconTitle: 'CVV-Generic'
  }
};

const STYLE_DEFAULTS = {
  COMMON: {
    fontColor: '#545457',
    fontFeatureSettings: 'normal',
    fontKerning: 'auto',
    fontSize: '16px',
    fontStretch: '100%',
    fontStyle: 'normal',
    fontVariant: 'normal',
    fontWeight: 400,
    letterSpacing: 'normal',
    lineHeight: 'normal',
    textAlign: 'start',
    textRendering: 'auto',
    textShadow: 'none',
    textTransform: 'none'
  },
  COMBINED: {
      fontFamily: 'source sans pro',
      textDecoration: 'none solid rgb(84, 84, 87)'
  },
  DISTINCT: {
      fontFamily: 'helvetica',
      textDecoration: 'none solid rgb(0, 0, 0)'
  }
};

const SEL = {
  output: '[data-test=output]',
  form: '[data-test=form]',
  submit: '[data-test=submit]',
  firstName: '[data-test="first-name"]',
  lastName: '[data-test="last-name"]',
  iframe: '.recurly-hosted-field iframe',
  number: 'input[placeholder="Card number"]',
  expiry: 'input[placeholder="MM / YY"]',
  cvv: 'input[placeholder="CVV"]'
};

const NAME = {
  firstName: 'John',
  lastName: 'Rambo',
};

module.exports = {
  assertIsARecurlyError,
  assertIsAToken,
  assertStyleIs,
  assertStyleColorIs,
  configureRecurly,
  createElement,
  environment,
  getInputPlaceholderStyle,
  init,
  styleHostedField,
  tokenize,
  CARDS,
  ELEMENT_TYPES,
  FIELD_TYPES,
  TOKEN_TYPES,
  STYLE_DEFAULTS,
  SEL,
  NAME
};

// Setup helpers

/**
 * initializes a standard e2e test
 *
 * @param {Object} opts to pass to recurly.configure
 * @return {Promise}
 */
function init ({ fixture = '', opts = {} } = {}) {
  return async () => {
    await browser.url(`e2e/${fixture}`);
    return await configureRecurly(Object.assign({}, environment(), opts));
  };
}

/**
 * Configures the global recurly singleton on the test suite
 *
 * @param {Object} opts to pass to recurly.configure
 * @return {Promise}
 */
async function configureRecurly (opts = {}) {
  console.log('configureRecurly', opts);

  return await browser.executeAsync(function (opts, done) {
    recurly.configure(opts);
    recurly.ready(function () {
      done();
    });
  }, opts);
}

/**
 * Creates an Element
 *
 * @param {String} elementClass one of ELEMENT_TYPES
 */
async function createElement (elementClass, config = {}) {
  return await browser.executeAsync(function (elementClass, config, done) {
    const elements = window.__e2e__.elements = window.__e2e__.elements || recurly.Elements();
    const element = elements[elementClass](config);
    const container = document.querySelector('.test-element-container');

    element.on('attach', function () {
      done();
    });
    element.attach(container);
  }, elementClass, config);
}

/**
 * Sets style options for a Hosted Field
 *
 * @param  {String} field     one of FIELD_TYPES
 * @param  {Object} styleOpts style properties. ex: `{ fontColor: 'green' }`
 * @return {Promise}
 */
async function styleHostedField (field = FIELD_TYPES.CARD, styleOpts = {}) {
  console.log('111111=' + field)
  console.log('222222=', styleOpts)
  console.log('3333333')
  return await configureRecurly({
    fields: {
      [field]: {
        style: styleOpts
      }
    }
  });
}

// Action helpers

/**
 * Tokenizes a given form
 *
 * This currently only works for
 *
 * @param  {String} form query selector of the form to tokenize
 * @return {Array} array of [err, token], as returned by `recurly.token`
 */
async function tokenize (form) {
  return await browser.executeAsync(function (form, done) {
    recurly.token(document.querySelector(form), function (err, token) {
      done([err, token]);
    });
  }, form);
}

// Assertion helpers

/**
 * Asserts that a given element has the given CSS property color
 *
 * @param {Element} element
 * @param {String}  property CSS property to check.
 * @param {String}  value
 */
async function assertStyleIs (element, property, value) {
 // console.log('aaaaaa=', element)
  console.log('bbbbbb=' + property)
  console.log('cccccc=' + value)
  return assert.strictEqual((await element.getCSSProperty(property)).value, value);
}

/**
 * Asserts that a given element has the given CSS property color
 *
 * @param {Element} element
 * @param {String}  hex            ex: '#000000'
 * @param {String}  [prop='color'] CSS property to check. Defaults to font color.
 */
async function assertStyleColorIs (element, hex, prop = 'color') {
  return assert.strictEqual((await element.getCSSProperty(prop)).parsed.hex, hex);
}

/**
 * Asserts that a given object has the shape of a token
 *
 * @param {Object} maybeToken   expected to be a token
 * @param {String} expectedType the type the token should be
 */
function assertIsAToken (maybeToken, expectedType = TOKEN_TYPES.CREDIT_CARD) {
  assert(maybeToken);
  assert.strictEqual(maybeToken.type, expectedType);
  assert.match(maybeToken.id, TOKEN_PATTERN);
}

/**
 * Asserts that a given object is a RecurlyError, optionally with deep inclusive comparison.
 *
 * @param  {Object} maybeError   expected to be a RecurlyError
 * @param  {Object} [includes] deep includes object
 */
function assertIsARecurlyError (maybeError, includes = {}) {
  assert(maybeError);
  assert.strictEqual(typeof maybeError.code, 'string');
  assert.strictEqual(typeof maybeError.message, 'string');
  assert.notStrictEqual(maybeError.code, '');
  assert.notStrictEqual(maybeError.message, '');
  for (const [key, val] of Object.entries(includes)) {
    assert.strictEqual(JSON.stringify(maybeError[key]), JSON.stringify(val));
  }
}

// Generics

/**
 * Gets the value of a placeholder style prop for input elements
 *
 * @param  {String} prop the property to retrieve. ex: 'color'
 * @return {String} the prop's value
 */
async function getInputPlaceholderStyle (prop) {
  return await browser.execute(function (prop) {
    var selectors = [
      '::-webkit-input-placeholder',
      'input::-moz-placeholder',
      'input:-ms-input-placeholder'
    ];
    var sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      if (sheet.href) continue; // skip external sheets
      var rules = sheet.cssRules;
      for (var j = 0; j < rules.length; j++) {
        var rule = rules[j];
        if (!rule.selectorText) continue;
        for (var k = 0; k < selectors.length; k++) {
          var sel = selectors[k]
          if (!!~rule.selectorText.indexOf(sel)) {
            return rule.style.getPropertyValue(prop);
          }
        }
      }
    }
  }, prop);
}

// Utility

function environment () {
  const {
    API: api,
    API_PROXY: apiProxy,
    PUBLIC_KEY: publicKey
  } = global.testEnvironment;
  const opts = {};
  opts.api = apiProxy || api || 'https://api.recurly.com/js/v1';
  opts.publicKey = publicKey || 'ewr1-zfJT5nPe1qW7jihI32LIRH';
  return opts;
}
