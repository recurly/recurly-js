const assert = require('assert');

const PATH = 'e2e';
const DEFAULT_RECURLY_CONFIG = {
  publicKey: 'ewr1-zfJT5nPe1qW7jihI32LIRH'
};
const TOKEN_PATTERN = /^[\w-]{21,23}$/;

module.exports = {
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
  await browser.url(PATH);
  return await configureRecurly(Object.assign({}, DEFAULT_RECURLY_CONFIG, opts));
}

/**
 * Configures the global recurly singleton on the test suite
 *
 * @param {Object} opts to pass to recurly.configure
 */
async function configureRecurly (opts = {}) {
  return await browser.executeAsync((opts, done) => {
    recurly.configure(opts);
    recurly.ready(() => done());
  }, opts);
}

// Assertion helpers

function assertIsAToken (maybeToken, expectedType = 'credit_card') {
  assert(maybeToken);
  assert.strictEqual(maybeToken.type, expectedType);
  assert.match(maybeToken.id, TOKEN_PATTERN);
}
