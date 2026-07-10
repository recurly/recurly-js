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

// iOS Safari (via BrowserStack WebDriver) immediately rejects executeAsync with a 1ms
// timeout. IFrameManager.stopSession() uses executeAsync to retrieve coverage and wait
// for the iframe to unload. When it throws, WTR catches the error and marks the entire
// session as failed (session.passed = false) even though all test assertions passed.
// Patching stopSession to swallow the error lets the actual test results stand;
// we just skip coverage cleanup (coverage is not collected on BrowserStack runs anyway).
try {
  // @web/test-runner-webdriver restricts its exports map to the package root, so we
  // resolve the package's CJS entry and navigate to sibling files from there.
  const wtrWdPath = require.resolve('@web/test-runner-webdriver');

  // IFrameManager.stopSession uses executeAsync to wait for iframe unload. iOS Safari
  // (via BrowserStack WebDriver) immediately rejects executeAsync with a 1ms timeout,
  // causing WTR to mark every passing session as failed. Swallow the error so real
  // test results stand; coverage is not collected on BrowserStack runs anyway.
  const { IFrameManager } = require(wtrWdPath.replace('/index.js', '/IFrameManager.js'));
  const _origStopSession = IFrameManager.prototype.stopSession;
  IFrameManager.prototype.stopSession = async function (id) {
    try {
      return await _origStopSession.call(this, id);
    } catch {
      const frameId = this.framePerSession.get(id);
      if (frameId) this.inactiveFrames.push(frameId);
      return { testCoverage: undefined };
    }
  };

  // SessionManager.stopSession navigates to about:blank between test files. On iOS 26
  // (iPhone 17 Pro via BrowserStack) the next navigateTo(testUrl) call hangs whenever the
  // browser is at about:blank after a clean test run — but navigating directly from one
  // test page to the next (testUrl_N → testUrl_N+1) works fine. The root cause is that
  // iOS 26 Safari via BrowserStack only rejects navigations from non-WTR pages (about:blank,
  // BrowserStack landing page) to WTR test pages.
  //
  // Strategy: track whether each startSession's navigation is still pending when stopSession
  // is called. If it is (timeout case), we navigate to about:blank to cancel the stuck
  // WebDriver command — the next test file then navigates from about:blank and succeeds
  // because the stuck command clears the timing issue. If it is not pending (clean success),
  // we skip the navigation so the browser stays on the test page, and the next test's
  // navigateTo runs testUrl_N → testUrl_N+1 which iOS 26 Safari handles correctly.
  const { SessionManager } = require(wtrWdPath.replace('/index.js', '/SessionManager.js'));
  const { validateBrowserResult } = require(wtrWdPath.replace('/index.js', '/coverage.js'));
  const _origSMStartSession = SessionManager.prototype.startSession;
  SessionManager.prototype.startSession = async function (id, url) {
    this._sessionWithPendingNav = id;
    try {
      await _origSMStartSession.call(this, id, url);
    } finally {
      // Only clear the flag if this session is still the active pending one.
      // A newer session may have already set the flag — don't overwrite it.
      if (this._sessionWithPendingNav === id) {
        this._sessionWithPendingNav = null;
      }
    }
  };
  SessionManager.prototype.stopSession = async function (id) {
    // If this session's navigation was still in-flight when stopSession was called,
    // we're recovering from a testsStartTimeout — navigate to about:blank to cancel
    // the stuck WebDriver command. Otherwise skip the navigation.
    const wasNavigationPending = this._sessionWithPendingNav === id;
    let testCoverage;
    try {
      const rv = await this.driver.execute(
        'return (function(){ return { testCoverage: window.__coverage__ }; })()'
      );
      if (validateBrowserResult(rv)) testCoverage = rv.testCoverage;
    } catch { /* no coverage on BrowserStack */ }
    this.urlMap.delete(id);
    if (wasNavigationPending) {
      // Cancel the stuck pending navigation by navigating to about:blank.
      // The next startSession will navigate from about:blank, which iOS 26 Safari
      // handles after the stuck command has been cleared.
      try {
        await this.driver.navigateTo('about:blank');
      } catch { /* ignore if navigation fails */ }
    }
    // If not pending (clean success): don't navigate. The browser stays at testUrl_N,
    // and the next startSession navigates testUrl_N → testUrl_N+1 (works on iOS 26).
    return { testCoverage: this.config.coverage ? testCoverage : undefined };
  };
} catch (e) {
  console.warn('[patch] Could not patch WTR session managers:', e.message);
}

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
  result['browserstack.consoleLogs'] = 'errors';

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
  // iOS 26 Safari can't establish WebSocket connections from iframes, so
  // IFrameManager never receives the test-ready signal. SessionManager
  // (concurrency: 1) navigates the top-level window directly, avoiding iframes.
  // Other BrowserStack browsers (Safari-Remote, Edge-Remote) break with
  // concurrency: 1, so this is scoped to iOS-26-Remote only.
  ...(BROWSER === 'iOS-26-Remote' ? { concurrency: 1 } : {}),
  browserStartTimeout: BS_CAP ? 120000 : 60000,
  testsStartTimeout: BS_CAP ? 120000 : 60000,
  testsFinishTimeout: BS_CAP ? 300000 : 600000,
};
