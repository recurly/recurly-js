import { build as esbuildBuild } from 'esbuild';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';

export const __projectRoot = path.dirname(fileURLToPath(import.meta.url));

// ---------- assert shim ----------

const ASSERT_SHIM_PATH = '/__assert-shim.js';
const ASSERT_SHIM_BODY = `
function AssertionError (message, actual, expected) {
  this.name = 'AssertionError';
  this.message = message || '';
  this.actual = actual;
  this.expected = expected;
}
AssertionError.prototype = Object.create(Error.prototype);
AssertionError.prototype.constructor = AssertionError;

function deepEqual (a, b, strict) {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' && typeof a !== 'function') return strict ? a === b : a == b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k], strict)) return false;
  }
  return true;
}

function fail (message) {
  throw new AssertionError(typeof message === 'string' ? message : String(message));
}

function ok (val, message) {
  if (!val) throw new AssertionError(message || ('Expected truthy but got ' + val), val, true);
}

function equal (actual, expected, message) {
  if (actual != expected) throw new AssertionError(message || (actual + ' == ' + expected), actual, expected);
}

function strictEqual (actual, expected, message) {
  if (actual !== expected) throw new AssertionError(message || (actual + ' === ' + expected), actual, expected);
}

function notEqual (actual, expected, message) {
  if (actual == expected) throw new AssertionError(message || (actual + ' != ' + expected), actual, expected);
}

function notStrictEqual (actual, expected, message) {
  if (actual === expected) throw new AssertionError(message || (actual + ' !== ' + expected), actual, expected);
}

function deepEqualFn (actual, expected, message) {
  if (!deepEqual(actual, expected, false)) throw new AssertionError(message || 'deepEqual failed', actual, expected);
}

function deepStrictEqual (actual, expected, message) {
  if (!deepEqual(actual, expected, true)) throw new AssertionError(message || 'deepStrictEqual failed', actual, expected);
}

function notDeepEqual (actual, expected, message) {
  if (deepEqual(actual, expected, false)) throw new AssertionError(message || 'notDeepEqual failed', actual, expected);
}

function throws (fn, expected, message) {
  let threw = false, err;
  try { fn(); } catch (e) { threw = true; err = e; }
  if (!threw) throw new AssertionError(message || 'Expected function to throw');
  if (expected instanceof RegExp && !expected.test(err && err.message)) {
    throw new AssertionError(message || ('Expected error matching ' + expected), err && err.message, expected);
  }
}

function doesNotThrow (fn, message) {
  try { fn(); } catch (e) {
    throw new AssertionError(message || ('Got unwanted exception: ' + e.message));
  }
}

function match (actual, regexp, message) {
  if (!regexp.test(actual)) throw new AssertionError(message || (actual + ' matched ' + regexp), actual, regexp);
}

const assert = ok;
assert.AssertionError = AssertionError;
assert.fail = fail;
assert.ok = ok;
assert.equal = equal;
assert.strictEqual = strictEqual;
assert.notEqual = notEqual;
assert.notStrictEqual = notStrictEqual;
assert.deepEqual = deepEqualFn;
assert.deepStrictEqual = deepStrictEqual;
assert.notDeepEqual = notDeepEqual;
assert.throws = throws;
assert.doesNotThrow = doesNotThrow;
assert.match = match;

export { AssertionError, fail, ok, equal, strictEqual, notEqual, notStrictEqual, deepEqualFn as deepEqual, deepStrictEqual, notDeepEqual, throws, doesNotThrow, match };
export default assert;
`;

export function assertShimPlugin () {
  return {
    name: 'assert-shim',
    serve (context) {
      if (context.path !== ASSERT_SHIM_PATH) return;
      return { body: ASSERT_SHIM_BODY, type: 'js' };
    },
    resolveImport ({ source }) {
      if (source === 'assert') return ASSERT_SHIM_PATH;
    },
  };
}

// ---------- promise shim ----------

const PROMISE_SHIM_PATH = '/__promise-shim.js';
const PROMISE_SHIM_BODY = `
// Extend native Promise with .done() and .nodeify() from the 'promise' npm package.
if (!Promise.prototype.done) {
  Promise.prototype.done = function (onFulfilled, onRejected) {
    const self = arguments.length ? this.then(...arguments) : this;
    self.then(null, err => { setTimeout(() => { throw err; }, 0); });
  };
}
if (!Promise.prototype.nodeify) {
  Promise.prototype.nodeify = function (callback, ctx) {
    if (typeof callback !== 'function') return this;
    this.then(
      value => { queueMicrotask(() => callback.call(ctx, null, value)); },
      err => { queueMicrotask(() => callback.call(ctx, err)); }
    );
  };
}
export default Promise;
`;

export function promiseShimPlugin () {
  return {
    name: 'promise-shim',
    serve (context) {
      if (context.path !== PROMISE_SHIM_PATH) return;
      return { body: PROMISE_SHIM_BODY, type: 'js' };
    },
    resolveImport ({ source }) {
      if (source === 'promise') return PROMISE_SHIM_PATH;
    },
  };
}

// ---------- esbuild CJS bundler ----------

// Bundle CJS npm packages on demand with esbuild so the browser receives proper ESM.
// fromRollup(commonjs) transforms files individually and can't handle packages whose
// CJS pattern (e.g. debug's `module.exports = require('./common')(exports)`) produces
// ambiguous named-vs-default exports.
const ESM_BUNDLE_PREFIX = '/__esm/';
const esbundleCache = new Map();

export function esbuildBundlePlugin () {
  return {
    name: 'esbuild-bundle',
    resolveImport ({ source }) {
      if (source.startsWith('.') || source.startsWith('/') || source.startsWith('http')) return;
      if (source === 'assert' || source === 'promise') return;
      if (source === 'sinon') return;
      return `${ESM_BUNDLE_PREFIX}${encodeURIComponent(source)}.js`;
    },
    async serve (context) {
      if (!context.path.startsWith(ESM_BUNDLE_PREFIX)) return;
      const encoded = context.path.slice(ESM_BUNDLE_PREFIX.length, -3);
      const pkgName = decodeURIComponent(encoded);
      if (esbundleCache.has(pkgName)) {
        return { body: esbundleCache.get(pkgName), type: 'js' };
      }
      try {
        const result = await esbuildBuild({
          entryPoints: [pkgName],
          bundle: true,
          format: 'esm',
          platform: 'browser',
          write: false,
          define: { 'process.env.NODE_ENV': '"test"' },
          loader: { '.json': 'json' },
        });
        const body = result.outputFiles[0].text;
        esbundleCache.set(pkgName, body);
        return { body, type: 'js' };
      } catch (err) {
        console.error(`[esbuild-bundle] Failed to bundle "${pkgName}":`, err.message);
      }
    },
  };
}

// ---------- other plugins ----------

export function jsonPlugin () {
  return {
    name: 'json',
    transform (context) {
      if (!context.path.endsWith('.json')) return;
      context.type = 'text/javascript';
      context.body = `export default ${context.body};`;
    },
  };
}

// Add .js extension to relative imports that lack a recognized file extension.
// Browsers (unlike Node.js) require explicit extensions.
const KNOWN_EXTENSIONS = /\.(js|ts|jsx|tsx|css|json|html|mjs|cjs)$/i;

export function addExtensionPlugin () {
  return {
    name: 'add-js-extension',
    resolveImport ({ source, context }) {
      if (!source.startsWith('.') && !source.startsWith('/')) return;
      if (KNOWN_EXTENSIONS.test(source)) return;
      const importerDir = path.dirname(context.path.replace(/\?.*$/, ''));
      const fsBase = importerDir.startsWith('/') ? importerDir.slice(1) : importerDir;
      const resolved = path.resolve(__projectRoot, fsBase, source);
      if (existsSync(resolved + '.js')) return resolved.replace(__projectRoot, '') + '.js';
      if (existsSync(path.join(resolved, 'index.js'))) return resolved.replace(__projectRoot, '') + '/index.js';
    },
  };
}

// ---------- API proxy ----------

export function apiProxyMiddleware () {
  return async (ctx, next) => {
    if (!ctx.path.startsWith('/api')) return next();

    await new Promise((resolve, reject) => {
      const proxyReq = http.request(
        {
          hostname: 'localhost',
          port: 9877,
          path: ctx.url.replace(/^\/api/, ''),
          method: ctx.method,
          headers: { ...ctx.headers, host: 'localhost:9877' },
        },
        proxyRes => {
          ctx.status = proxyRes.statusCode;
          Object.entries(proxyRes.headers).forEach(([name, value]) => ctx.set(name, value));
          const chunks = [];
          proxyRes.on('data', chunk => chunks.push(chunk));
          proxyRes.on('end', () => { ctx.body = Buffer.concat(chunks); resolve(); });
          proxyRes.on('error', reject);
        }
      );
      proxyReq.on('error', reject);
      ctx.req.pipe(proxyReq);
    });
  };
}

// ---------- HTML template ----------

export function testRunnerHtml (testFramework) {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        <script src="/node_modules/sinon/pkg/sinon.js"></script>
        <script type="module">
          import { Recurly } from '/lib/recurly.js';
          window.recurly = new Recurly();
        </script>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>
  `;
}

// ---------- shared config defaults ----------

export const sharedConfig = {
  files: 'test/unit/**/*.test.js',
  testFramework: {
    config: { timeout: 7000 },
  },
  testRunnerHtml,
  middleware: [apiProxyMiddleware()],
  coverageConfig: {
    reportDir: 'build/reports/coverage',
    reporters: ['lcovonly'],
    include: ['lib/**/*.js'],
  },
  testsStartTimeout: 60000,
};
