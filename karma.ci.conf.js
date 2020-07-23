const branchName = require('current-git-branch');
const staticConfig = require('./karma.conf').staticConfig;
const {
  capabilities: browserStackCapabilities,
  projectName: project
} = require('./test/conf/browserstack');

const {
  BROWSER = 'chrome',
  REPORT_COVERAGE = false,
  TRAVIS_BUILD_NUMBER
} = process.env;

const BROWSER_STACK_CAPABILITY = browserStackCapabilities[BROWSER];

function runner (config) {
  const cfg = Object.assign({}, staticConfig, {
    reporters: ['mocha'],
    logLevel: config.LOG_INFO,
    browsers: [BROWSER],
    customLaunchers: customLaunchers(),
    hostname: hostname()
  });

  if (REPORT_COVERAGE) {
    cfg.reporters.push('coverage');
  }

  if (BROWSER_STACK_CAPABILITY) {
    cfg.browserStack = {
      project,
      build: `${TRAVIS_BUILD_NUMBER || `local unit [${branchName()}]`}`,
      autoAcceptAlerts: true,
      forceLocal: true,
      'browserstack.local': true,
      'browserstack.debug': true,
      'browserstack.console': 'verbose',
      'browserstack.networkLogs': true,
      captureTimeout: 1200,
      localIdentifier: `${Math.round(Math.random() * 100)}-${Date.now()}`,
      pollingTimeout: 4000,
      timeout: 1200
    };
    cfg.reporters.push('BrowserStack');
  }

  console.log(cfg);

  config.set(cfg);
};

const server = require('./test/server');

module.exports = runner;

function customLaunchers () {
  const launchers = {
    ChromeHeadlessCI: {
      base: 'ChromeHeadless',
      flags: ['--no-sandbox']
    }
  };

  if (BROWSER_STACK_CAPABILITY) {
    launchers[BROWSER] = toLegacyLauncher(BROWSER_STACK_CAPABILITY);
  }

  return launchers;
}

/**
 * karma-browserstack-launcher only supports the legacy
 * JSONWP WebDriver protocol
 *
 * @param {Object} capability
 * @return {Object}
 */
function toLegacyLauncher (capability) {
  const capabilities = Object.assign({}, capability);
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

function hostname () {
  if (BROWSER_STACK_CAPABILITY) return 'bs-local.com';
  return 'localhost';
}
