const assert = require('assert');
const memoize = require('memoize-one');

const TOKEN_PATTERN = /^[\w-]{21,23}$/;

const BROWSERS = {
  IE_11: 'ie_11'
};

const DEVICES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile'
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
  environmentIs: memoize(environmentIs),
  FIELD_TYPES,
  init,
  recurlyEnvironment,
  tokenize,
  TOKEN_TYPES
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
  const browsers = Object.values(BROWSERS);
  const devices = Object.values(DEVICES);

  for (condition of conditions) {
    if (browsers.includes(condition)) {
      if (process.env.BROWSER === condition) {
        return true;
      }
    }

    if (devices.includes(condition)) {
      const { capabilities } = browser;
      const isMobile = capabilities.realMobile === 'true' || ['iOS', 'Android'].includes(capabilities.platformName);
      if (condition === DEVICES.MOBILE && isMobile) return true;
      if (condition === DEVICES.DESKTOP && !isMobile) return true;
    }
  }

  return false;
}


// iOS 13
//   webStorageEnabled: false,
//   locationContextEnabled: false,
//   browserName: 'safari',
//   platform: 'MAC',
//   javascriptEnabled: true,
//   databaseEnabled: false,
//   takesScreenshot: true,
//   networkConnectionEnabled: false,
//   platformName: 'iOS',
//   newCommandTimeout: 0,
//   realMobile: 'true',
//   deviceName: 'iPhone XS',
//   safariIgnoreFraudWarning: true,
//   noReset: true,
//   keychainPath: '/Users/app/Library/Keychains/Browserstack.keychain-db',
//   keychainPassword: 'gushed7hiring',
//   platformVersion: '12.1',
//   useXctestrunFile: true,
//   bootstrapPath: '/usr/local/.browserstack/config/wda_derived_data_00008020-001E75CE3CD3002E_1.16.0/Build/Products',
//   orientation: 'PORTRAIT',
//   'browserstack.isTargetBased': 'true',
//   udid: '00008020-001E75CE3CD3002E'

// Chrome MacOS
//   acceptInsecureCerts: true,
//   browserName: 'chrome',
//   browserVersion: '83.0.4103.61',
//   chrome: {
//     chromedriverVersion: '83.0.4103.39 (ccbf011cb2d2b19b506d844400483861342c20cd-refs/branch-heads/4103@{#416})',
//     userDataDir: '/var/folders/3y/zz_w6_s56sl__vcrf3r5bhzr0000hr/T/.com.google.Chrome.G4PQLx'
//   },
//   'goog:chromeOptions': { debuggerAddress: 'localhost:65231' },
//   networkConnectionEnabled: false,
//   pageLoadStrategy: 'normal',
//   platformName: 'mac os x',
//   proxy: {},
//   setWindowRect: true,
//   strictFileInteractability: false,
//   timeouts: { implicit: 0, pageLoad: 300000, script: 30000 },
//   unhandledPromptBehavior: 'dismiss and notify',
//   'webauthn:virtualAuthenticators': true,
//   'webdriver.remote.sessionid': '44dd9313b83ccd67873bd5888477a1da4d281d13'

// IE 11
//   acceptInsecureCerts: false,
//   browserName: 'internet explorer',
//   browserVersion: '11',
//   pageLoadStrategy: 'normal',
//   platformName: 'windows',
//   proxy: {},
//   'se:ieOptions': {
//     browserAttachTimeout: 0,
//     elementScrollBehavior: 0,
//     enablePersistentHover: true,
//     'ie.browserCommandLineSwitches': '',
//     'ie.ensureCleanSession': false,
//     'ie.fileUploadDialogTimeout': 3000,
//     'ie.forceCreateProcessApi': false,
//     ignoreProtectedModeSettings: false,
//     ignoreZoomSetting: false,
//     initialBrowserUrl: 'about:blank',
//     nativeEvents: true,
//     requireWindowFocus: false
//   },
//   setWindowRect: true,
//   strictFileInteractability: false,
//   timeouts: { implicit: 0, pageLoad: 300000, script: 30000 },
//   unhandledPromptBehavior: 'dismiss and notify',
//   'webdriver.remote.sessionid': 'c5f750f84fa59167aef74b758c81c5196ffa2287'
