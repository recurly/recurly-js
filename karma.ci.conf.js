const branchName = require('current-git-branch');
const staticConfig = require('./karma.conf').staticConfig;
const {
  customLaunchers,
  project
} = require('./test/conf/browserstack');

const {
  BROWSER,
  REPORT_COVERAGE,
  TRAVIS_BUILD_NUMBER
} = process.env;

function runner (config) {
  const reporters = ['mocha', 'BrowserStack'];
  if (REPORT_COVERAGE) reporters.push('coverage');

  const logLevel = config.LOG_INFO;

  config.set(Object.assign({}, staticConfig, {
    reporters,
    logLevel,
    browsers: [`bs_${BROWSER || 'chrome'}`],
    browserStack: {
      project,
      build: `${TRAVIS_BUILD_NUMBER || `local unit [${branchName()}]`}`,
      autoAcceptAlerts: 'true',
      'browserstack.console': 'verbose',
      'browserstack.networkLogs': 'true',
      captureTimeout: 1200,
      pollingTimeout: 4000,
      timeout: 1200
    },
    customLaunchers,
    hostname: 'bs-local.com'
  }));
};

const server = require('./test/server');

module.exports = runner;
