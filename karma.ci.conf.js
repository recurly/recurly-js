const branchName = require('current-git-branch');
const staticConfig = require('./karma.conf').staticConfig;
const {
  capabilities: launchers,
  projectName: project
} = require('./test/conf/browserstack');

const {
  BROWSER,
  REPORT_COVERAGE,
  TRAVIS_BUILD_NUMBER
} = process.env;

const localIdentifier = `${Math.round(Math.random() * 100)}-${Date.now()}`;

function runner (config) {
  const reporters = ['mocha', 'BrowserStack'];
  if (REPORT_COVERAGE) reporters.push('coverage');

  const logLevel = config.LOG_INFO;
  const launcherName = `bs_${BROWSER || 'chrome'}`;
  const cfg = Object.assign({}, staticConfig, {
    reporters,
    logLevel,
    browsers: [launcherName],
    browserStack: {
      project,
      build: `${TRAVIS_BUILD_NUMBER || `local unit [${branchName()}]`}`,
      autoAcceptAlerts: true,
      forceLocal: true,
      'browserstack.local': true,
      'browserstack.debug': true,
      'browserstack.console': 'verbose',
      'browserstack.networkLogs': true,
      captureTimeout: 1200,
      localIdentifier,
      pollingTimeout: 4000,
      timeout: 1200
    },
    customLaunchers: {
      [launcherName]: toLegacyLauncher(launchers[launcherName]),
      bs_chrome_headless: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      },
      bs_electron: {
        base: 'Electron'
      }
    },
    hostname: 'bs-local.com'
  });

  console.log(cfg)

  config.set(cfg);
};

const server = require('./test/server');

module.exports = runner;

/**
 * karma-browserstack-launcher only supports the legacy
 * JSONWP WebDriver protocol
 *
 * @param {Object} launcher
 * @return {Object}
 */
function toLegacyLauncher (launcher) {
  const capabilities = Object.assign({}, launcher);
  const translations = {
    browserName: 'browser',
    browserVersion: 'browser_version',
    deviceName: 'device',
    osVersion: 'os_version',
    realMobile: 'real_mobile'
  };
  for (const [newCap, oldCap] of Object.entries(translations)) {
    if (capabilities[newCap]) {
      delete Object.assign(capabilities, { [oldCap]: capabilities[newCap] })[newCap];
    }
  }
  capabilities.base = 'BrowserStack';

  // Csutom transformations
  if (capabilities.ie) {
    capabilities.os_version = '10';
    capabilities['browserstack.ie.enablePopups'] = capabilities.ie.enablePopups;
    delete capabilities.ie;
  } else if (capabilities.edge) {
    capabilities['browserstack.edge.enablePopups'] = capabilities.edge.enablePopups;
    delete capabilities.edge;
  } else if (capabilities.safari) {
    capabilities['browserstack.safari.enablePopups'] = capabilities.safari.enablePopups;
    delete capabilities.safari;
  }

  return capabilities;
}
