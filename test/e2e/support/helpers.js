const assert = require('assert');
const memoize = require('memoize-one');

const TOKEN_PATTERN = /^[\w-]{21,23}$/;

const BROWSERS = {
  IE_11: ['internet explorer', '11']
};

const DEVICES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  IOS: 'ios',
  ANDROID: 'android'
}

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
  BECS_BANK_ACCOUNT: 'becs_bank_account',
  THREE_D_SECURE_ACTION: 'three_d_secure_action',
  THREE_D_SECURE_ACTION_RESULT: 'three_d_secure_action_result'
};

module.exports = {
  assertIsAToken,
  BROWSERS,
  configureRecurly,
  createElement,
  DEVICES,
  ELEMENT_TYPES,
  elementAndFieldSuite,
  environmentIs: memoize(environmentIs),
  FIELD_TYPES,
  init,
  recurlyEnvironment,
  tokenize,
  TOKEN_TYPES
};

// suite helpers

/**
 * Builds a test suite which will execute a test against
 * the cohorts of the following implementations:
 *   - CardElement
 *   - distinct CardElements: number, month, year, cvv
 *   - Card Hosted field
 *   - distinct Card Hosted fields: number, month, year, cvv
 *
 * Use this when testing a behavior which is expected to apply
 * across all of these implementations
 *
 * @param {Function} tests A callback which executes the tests
 */
function elementAndFieldSuite (tests) {
  const { VARIANTS } = elementAndFieldSuite;

  return () => {
    describe('when using Elements', function () {
      beforeEach(init());

      describe('CardElement', function () {
        beforeEach(async () => {
          await createElement(ELEMENT_TYPES.CardElement);
        });
        tests(VARIANTS.CardElement);
      });

      describe('distinct card Elements', function () {
        beforeEach(async () => {
          await createElement(ELEMENT_TYPES.CardNumberElement);
          await createElement(ELEMENT_TYPES.CardMonthElement);
          await createElement(ELEMENT_TYPES.CardYearElement);
          await createElement(ELEMENT_TYPES.CardCvvElement);
        });
        tests(VARIANTS.DistinctCardElements);
      });
    });

    describe('when using a Card Hosted Field', function () {
      beforeEach(init({ fixture: 'hosted-fields-card' }));
      tests(VARIANTS.CardHostedField);
    });

    describe('when using distinct card Hosted Fields', function () {
      beforeEach(init({ fixture: 'hosted-fields-card-distinct' }));
      tests(VARIANTS.DistinctCardHostedFields);
    });
  };
}

elementAndFieldSuite.VARIANTS = {
  CardElement: 0,
  DistinctCardElements: 1,
  CardHostedField: 2,
  DistinctCardHostedFields: 3
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
    return await configureRecurly(Object.assign({}, recurlyEnvironment(), opts));
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
    window.__e2e__.elementReferences.push(element);
  }, elementClass, config);
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

// Utility

function recurlyEnvironment () {
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

/**
 * Checks for matches in the test environment.
 *
 * Use this to skip tests which cannot run in a particular browser or device
 *
 * @param  {...string} conditions list containing values from `BROWSERS`
 * @return {Boolean}
 */
function environmentIs (...conditions) {
  const {
    browserName,
    browserVersion,
    platformName
  } = browser.capabilities;
  const browsers = Object.values(BROWSERS);
  const devices = Object.values(DEVICES);
  const isIos = platformName === 'iOS';
  const isAndroid = platformName === 'Android';
  const isMobile = isIos || isAndroid;

  for (const condition of conditions) {
    if (browsers.includes(condition)) {
      const [ name, version ] = condition;
      if (name === browserName && version === browserVersion) {
        return true;
      }
    }

    if (devices.includes(condition)) {
      if (condition === DEVICES.ANDROID && isAndroid) return true;
      if (condition === DEVICES.IOS && isIos) return true;
      if (condition === DEVICES.MOBILE && isMobile) return true;
      if (condition === DEVICES.DESKTOP && !isMobile) return true;
    }
  }

  return false;
}
