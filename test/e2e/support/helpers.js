const assert = require('assert');

const TOKEN_PATTERN = /^[\w-]{21,23}$/;

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
  configureRecurly,
  environment,
  init,
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
