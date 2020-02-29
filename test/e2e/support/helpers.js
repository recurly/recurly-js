const assert = require('assert');

const TEST_PATH = 'e2e';
const TOKEN_PATTERN = /^[\w-]{21,23}$/;

module.exports = {
  environment,
  init,
  configureRecurly,
  assertIsAToken
};

// Setup helpers

/**
 * initializes a standard e2e test
 *
 * @param {Object} opts to pass to recurly.configure
 */
async function init (opts = {}) {
  await browser.url(TEST_PATH);
  return await configureRecurly(Object.assign({}, environment(), opts));
}

/**
 * Configures the global recurly singleton on the test suite
 *
 * @param {Object} opts to pass to recurly.configure
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

// Assertion helpers

function assertIsAToken (maybeToken, expectedType = 'credit_card') {
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
