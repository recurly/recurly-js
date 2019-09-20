const BROWSER = process.env.BROWSER;
const REPORT_COVERAGE = process.env.REPORT_COVERAGE || false;
const staticConfig = require('./karma.conf').staticConfig;
const customLaunchers = {
  bs_chrome_headless: {
    base: 'ChromeHeadless',
    flags: ['--no-sandbox']
  },

  bs_chrome: {
    base: 'BrowserStack',
    browser: 'Chrome',
    os: 'OS X',
    os_version: 'Mojave'
  },
  bs_firefox: {
    base: 'BrowserStack',
    browser: 'Firefox',
    os: 'OS X',
    os_version: 'Mojave'
  },
  bs_safari: {
    base: 'BrowserStack',
    browser: 'Safari',
    os: 'OS X',
    os_version: 'Mojave'
  },

  bs_edge: {
    base: 'BrowserStack',
    browser: 'Edge',
    os: 'Windows',
    os_version: '10'
  },
  bs_ie_11: {
    base: 'BrowserStack',
    browser: 'IE',
    browser_version: '11.0',
    os: 'Windows',
    os_version: '10'
  },


  bs_ios_12: {
    base: 'BrowserStack',
    device: 'iPhone 8',
    os: 'ios',
    os_version: '12.2',
    real_mobile: true
  },
  bs_ios_11: {
    base: 'BrowserStack',
    device: 'iPhone 8',
    os: 'ios',
    os_version: '11.4',
    real_mobile: true
  },

  bs_android_9: {
    base: 'BrowserStack',
    browser: 'android',
    device: 'Google Pixel 3',
    os: 'android',
    os_version: '9.0',
    real_mobile: true
  },
  bs_android_8: {
    base: 'BrowserStack',
    browser: 'android',
    device: 'Samsung Galaxy Note 9',
    os: 'android',
    os_version: '8.1',
    real_mobile: true
  },
  bs_android_7: {
    base: 'BrowserStack',
    browser: 'android',
    device: 'Google Pixel',
    os: 'android',
    os_version: '7.1',
    real_mobile: true
  },
  bs_android_6: {
    base: 'BrowserStack',
    browser: 'android',
    device: 'Google Nexus 6',
    os: 'android',
    os_version: '6.0',
    real_mobile: true
  },
};

function runner (config) {
  const reporters = ['mocha', 'BrowserStack'];
  if (REPORT_COVERAGE) reporters.push('coverage');

  const logLevel = config.LOG_INFO;

  config.set(Object.assign({}, staticConfig, {
    reporters,
    logLevel,
    browsers: ['bs_' + BROWSER],
    browserStack: {
      autoAcceptAlerts: 'true',
      'browserstack.console': 'verbose',
      'browserstack.debug': 'true',
      'browserstack.networkLogs': 'true',
      'browserstack.edge.enablePopups': 'true',
      'browserstack.ie.enablePopups': 'true',
      'browserstack.safari.enablePopups': 'true',
      captureTimeout: 1200,
      pollingTimeout: 4000,
      project: 'Recurly.js',
      timeout: 1200
    },
    customLaunchers,
    hostname: 'bs-local.com'
    // hostname: (~BROWSER.indexOf('ios') ? 'bs-local.com' : 'localhost')
  }));
};

const server = require('./test/server');

module.exports = runner;
