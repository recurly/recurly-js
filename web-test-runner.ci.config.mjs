import { playwrightLauncher } from '@web/test-runner-playwright';
import { browserstackLauncher } from '@web/test-runner-browserstack';
import { fromRollup } from '@web/dev-server-rollup';
import rollupNodeResolve from '@rollup/plugin-node-resolve';
import rollupCommonjs from '@rollup/plugin-commonjs';
import { build as esbuildBuild } from 'esbuild';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';

const require = createRequire(import.meta.url);
const { projectName, capabilities: bsCapabilities } = require('./test/conf/browserstack.js');
const branchName = require('current-git-branch');
require('@recurly/public-api-test-server');

const {
  BROWSER = 'Chrome',
  REPORT_COVERAGE,
  GITHUB_RUN_ID,
  BROWSER_STACK_USERNAME,
  BROWSER_STACK_ACCESS_KEY,
} = process.env;

const __projectRoot = path.dirname(fileURLToPath(import.meta.url));
const PROCESS_SHIM = path.join(__projectRoot, 'scripts/esbuild/process-shim.js');

const IS_REPORT_COVERAGE = REPORT_COVERAGE === 'true';
const BUILD_NAME = GITHUB_RUN_ID || `local unit [${branchName()}]`;
const BS_CAP = bsCapabilities[BROWSER];

const PLAYWRIGHT_PRODUCTS = {
  Chrome: 'chromium',
  Firefox: 'firefox',
};

const nodeResolve = fromRollup(rollupNodeResolve);
const commonjs = fromRollup(rollupCommonjs);

function jsonPlugin () {
  return {
    name: 'json',
    transform (context) {
      if (!context.path.endsWith('.json')) return;
      context.type = 'text/javascript';
      context.body = `export default ${context.body};`;
    },
  };
}

// Bundle CJS npm packages on demand with esbuild so the browser receives proper ESM.
// fromRollup(commonjs) transforms files individually and can't handle packages whose
// CJS pattern (e.g. debug's `module.exports = require('./common')(exports)`) produces
// ambiguous named-vs-default exports.
const ESM_BUNDLE_PREFIX = '/__esm/';
const esbundleCache = new Map();

function esbuildBundlePlugin () {
  return {
    name: 'esbuild-bundle',
    resolveImport ({ source }) {
      if (source.startsWith('.') || source.startsWith('/') || source.startsWith('http')) return;
      if (source === 'sinon') return; // loaded as UMD script tag
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
          inject: [PROCESS_SHIM],
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

// Convert from our W3C-style capabilities to the legacy format expected by
// @web/test-runner-browserstack (required fields: name, browserstack.user,
// browserstack.key, project, build).
function toBSCapabilities (cap) {
  const result = {
    'browserstack.user': BROWSER_STACK_USERNAME,
    'browserstack.key': BROWSER_STACK_ACCESS_KEY,
    project: projectName,
    build: BUILD_NAME,
    name: 'recurly-js unit test',
  };

  if (cap.browserName) result.browser = cap.browserName;
  if (cap.browserVersion) result.browser_version = cap.browserVersion;
  if (cap.os) result.os = cap.os;
  if (cap.osVersion) result.os_version = cap.osVersion;
  if (cap.deviceName) result.device = cap.deviceName;
  if (cap.realMobile !== undefined) result.real_mobile = cap.realMobile;

  return result;
}

function getBrowserLaunchers () {
  if (BS_CAP) {
    return [browserstackLauncher({ capabilities: toBSCapabilities(BS_CAP) })];
  }
  return [playwrightLauncher({ product: PLAYWRIGHT_PRODUCTS[BROWSER] || 'chromium' })];
}

function apiProxyMiddleware () {
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
          const chunks = [];
          proxyRes.on('data', chunk => chunks.push(chunk));
          proxyRes.on('end', () => { ctx.body = Buffer.concat(chunks); resolve(); });
          proxyRes.on('error', reject);
        }
      );
      proxyReq.on('error', reject);
      proxyReq.end();
    });
  };
}

export default {
  files: 'test/unit/**/*.test.js',
  browsers: getBrowserLaunchers(),
  plugins: [
    jsonPlugin(),
    esbuildBundlePlugin(),
    nodeResolve({ browser: true, preferBuiltins: false }),
    commonjs({ exclude: ['**/sinon/**'] }),
  ],
  testFramework: {
    config: { timeout: 7000 },
  },
  testRunnerHtml: testFramework => `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        <script src="/node_modules/sinon/pkg/sinon.js"></script>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>
  `,
  middleware: [apiProxyMiddleware()],
  coverage: IS_REPORT_COVERAGE,
  coverageConfig: {
    report: IS_REPORT_COVERAGE,
    reportDir: 'build/reports/coverage',
    reporters: ['lcovonly'],
    include: ['lib/**/*.js'],
  },
  browserStartTimeout: BS_CAP ? 120000 : 60000,
  testsStartTimeout: 60000,
  testsFinishTimeout: BS_CAP ? 300000 : 600000,
};
