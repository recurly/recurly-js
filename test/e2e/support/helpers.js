const assert = require('assert');
const memoize = require('memoize-one');

const TOKEN_PATTERN = /^[\w-]{21,23}$/;

const BROWSERS = {
  EDGE: ['Edge', 'msedge', 'MicrosoftEdge'],
  SAFARI: ['Safari'],
  FIREFOX: ['firefox']
};

const DEVICES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  IOS: 'ios',
  ANDROID: 'android',
};

const ELEMENT_TYPES = {
  CardElement: 'CardElement',
  CardNumberElement: 'CardNumberElement',
  CardMonthElement: 'CardMonthElement',
  CardYearElement: 'CardYearElement',
  CardCvvElement: 'CardCvvElement',
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
  BACS_BANK_ACCOUNT: 'bacs_bank_account',
  BECS_BANK_ACCOUNT: 'becs_bank_account',
  THREE_D_SECURE_ACTION: 'three_d_secure_action',
  THREE_D_SECURE_ACTION_RESULT: 'three_d_secure_action_result'
};

const SELECTORS = {
  HOSTED_FIELD_INPUT: '.recurly-hosted-field-input',
  CARD_ELEMENT: {
    NUMBER: 'input[placeholder="Card number"]',
    EXPIRY: 'input[placeholder="MM / YY"]',
    CVV: 'input[placeholder="CVV"]'
  }
};

const EXAMPLES = {
  NUMBER: '4111111111111111',
  NUMBER_FORMATTED: '4111 1111 1111 1111 ',
  MONTH: '10',
  YEAR: '28',
  CVV: '123'
};
EXAMPLES.EXPIRY = `${EXAMPLES.MONTH}${EXAMPLES.YEAR}`;
EXAMPLES.EXPIRY_FORMATTED = `${EXAMPLES.MONTH} / ${EXAMPLES.YEAR}`;

module.exports = {
  assertIsAToken,
  BROWSERS,
  configureRecurly,
  createElement,
  DEVICES,
  ELEMENT_TYPES,
  elementAndFieldSuite,
  environmentIs: memoize(environmentIs),
  EXAMPLES,
  FIELD_TYPES,
  fillCardElement,
  fillDistinctCardElements,
  fillCvvElement,
  fillElement,
  getValue,
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
 * @param {Object}   options An object with members for each element and field type
 * @param {Function} [options.cardElement]
 * @param {Function} [options.distinctCardElements]
 * @param {Function} [options.cardHostedField]
 * @param {Function} [options.distinctCardHostedFields]
 * @param {Function} [options.any] Will run if any of the other members are not defined
 */
function elementAndFieldSuite ({
  cardElement,
  distinctCardElements,
  cvvElement,
  cardHostedField,
  distinctCardHostedFields,
  cvvHostedField,
  any
}) {
  return () => {
    const maybeRun = maybe => (maybe || any)();

    describe('when using Elements', function () {
      beforeEach(init());

      describe('CardElement', function () {
        beforeEach(async function () {
          await createElement(ELEMENT_TYPES.CardElement);
        });
        maybeRun(cardElement);
      });

      describe('distinct card Elements', function () {
        beforeEach(async function () {
          await createElement(ELEMENT_TYPES.CardNumberElement);
          await createElement(ELEMENT_TYPES.CardMonthElement);
          await createElement(ELEMENT_TYPES.CardYearElement);
          await createElement(ELEMENT_TYPES.CardCvvElement);
        });
        maybeRun(distinctCardElements);
      });

      describe('distinct CardCvvElement', function () {
        beforeEach(async function () {
          await createElement(ELEMENT_TYPES.CardCvvElement);
        });
        maybeRun(cvvElement);
      });
    });

    describe('when using a card Hosted Field', function () {
      beforeEach(init({ fixture: 'hosted-fields-card' }));
      maybeRun(cardHostedField);
    });

    describe('when using distinct card Hosted Fields', function () {
      beforeEach(init({ fixture: 'hosted-fields-card-distinct' }));
      maybeRun(distinctCardHostedFields);
    });

    describe('when using a cvv Hosted Field', function () {
      beforeEach(init({ fixture: 'hosted-fields-cvv' }));
      maybeRun(cvvHostedField);
    });
  };
}

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

/**
 * Fills a CardElement or card Hosted Field with given values
 *
 * @param  {String} options.number
 * @param  {String} options.expiry
 * @param  {String} options.cvv
 */
async function fillCardElement ({
  number = EXAMPLES.NUMBER,
  expiry = EXAMPLES.EXPIRY,
  cvv = EXAMPLES.CVV
} = {}) {
  await fillElement(0, SELECTORS.CARD_ELEMENT.NUMBER, number);
  await fillElement(0, SELECTORS.CARD_ELEMENT.EXPIRY, expiry);
  await fillElement(0, SELECTORS.CARD_ELEMENT.CVV, cvv);
}

/**
 * Fills distinct card Elements or Hosted Fields with the given values
 *
 * @param  {String} options.number
 * @param  {String} options.month
 * @param  {String} options.year
 * @param  {String} options.cvv
 */
async function fillDistinctCardElements ({
  number = EXAMPLES.NUMBER,
  month = EXAMPLES.MONTH,
  year = EXAMPLES.YEAR,
  cvv = EXAMPLES.CVV
} = {}) {
  const examples = [number, month, year, cvv];
  for (const example of examples) {
    const i = examples.indexOf(example);
    await fillElement(i, SELECTORS.HOSTED_FIELD_INPUT, example);
  }
}

/**
 * Fills a cvv Hosted Field with the given value
 *
 * @param  {String} options.cvv
 */
async function fillCvvElement ({ cvv = EXAMPLES.CVV } = {}) {
  await fillElement(0, SELECTORS.HOSTED_FIELD_INPUT, cvv);
}

async function fillElement (frame, selector, val) {
  await browser.switchToFrame(frame);
  const input = await $(selector);

  // setvalue's underlying elementSendKeys is slow to act on Android. Thus we chunk the input.
  if (environmentIs(DEVICES.ANDROID) && val) {
    await input.clearValue();
    for (const chunk of val.match(/.{1,2}/g)) {
      await input.addValue(chunk);
    }
  } else {
    await input.click();
    await input.setValue(val);
  }

  await browser.switchToFrame(null);
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
    platformName
  } = browser.capabilities;
  const browsers = Object.values(BROWSERS);
  const devices = Object.values(DEVICES);
  const isIos = platformName === 'iOS';
  const isAndroid = platformName === 'Android';
  const isMobile = isIos || isAndroid;

  for (const condition of conditions) {
    if (browsers.includes(condition)) {
      return Array.isArray(condition)
        ? condition.some(c => c === browserName)
        : condition === browserName;
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

function getValue (selector) {
  if (environmentIs(DEVICES.ANDROID)) {
    return selector.getProperty('value');
  } else {
    return selector.getValue();
  }
}
