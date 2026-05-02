import { EventEmitter } from 'events';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { browserstackLauncher } from '@web/test-runner-browserstack';
import { fromRollup } from '@web/dev-server-rollup';
import rollupNodeResolve from '@rollup/plugin-node-resolve';
import rollupCommonjs from '@rollup/plugin-commonjs';
import { createRequire } from 'module';
import {
  assertShimPlugin,
  promiseShimPlugin,
  esbuildBundlePlugin,
  jsonPlugin,
  addExtensionPlugin,
  sharedConfig,
} from './web-test-runner.shared.mjs';

// BrowserStack registers a close listener per concurrent session on the shared
// WebSocket; raise the limit to avoid MaxListenersExceededWarning.
EventEmitter.defaultMaxListeners = 0; // 0 = unlimited; avoids warning with many concurrent BrowserStack sessions

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

const IS_REPORT_COVERAGE = REPORT_COVERAGE === 'true';
const BUILD_NAME = GITHUB_RUN_ID || `local unit [${branchName()}]`;
const BS_CAP = bsCapabilities[BROWSER];

const PLAYWRIGHT_PRODUCTS = {
  Chrome: 'chromium',
  Firefox: 'firefox',
};

const nodeResolve = fromRollup(rollupNodeResolve);
const commonjs = fromRollup(rollupCommonjs);

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

export default {
  ...sharedConfig,
  browsers: getBrowserLaunchers(),
  plugins: [
    assertShimPlugin(),
    promiseShimPlugin(),
    jsonPlugin(),
    esbuildBundlePlugin(),
    addExtensionPlugin(),
    nodeResolve({ browser: true, preferBuiltins: false }),
    commonjs({ exclude: ['**/sinon/**'] }),
  ],
  coverage: IS_REPORT_COVERAGE,
  coverageConfig: {
    ...sharedConfig.coverageConfig,
    report: IS_REPORT_COVERAGE,
  },
  browserStartTimeout: BS_CAP ? 120000 : 60000,
  testsStartTimeout: BS_CAP ? 120000 : 60000,
  testsFinishTimeout: BS_CAP ? 300000 : 600000,
};
