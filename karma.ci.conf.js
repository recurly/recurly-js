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
    os_version: 'Mojave',
    'browserstack.safari.enablePopups': 'true'
  },

  bs_edge: {
    base: 'BrowserStack',
    browser: 'Edge',
    os: 'Windows',
    os_version: '10',
    'browserstack.edge.enablePopups': 'true'
  },
  bs_ie_11: {
    base: 'BrowserStack',
    browser: 'IE',
    browser_version: '11.0',
    os: 'Windows',
    os_version: '7',
    'browserstack.ie.arch': 'x32',
    'browserstack.ie.enablePopups': 'true'
  },

  bs_ios_13: {
    base: 'BrowserStack',
    device: 'iPhone XS',
    os: 'ios',
    os_version: '13.0',
    real_mobile: true
  },
  bs_ios_12: {
    base: 'BrowserStack',
    device: 'iPhone XS',
    os: 'ios',
    os_version: '12.2',
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
  }
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
      'browserstack.networkLogs': 'true',
      captureTimeout: 1200,
      pollingTimeout: 4000,
      project: 'Recurly.js',
      timeout: 1200
    },
    customLaunchers,
    hostname: 'bs-local.com'
  }));
};

const server = require('./test/server');

module.exports = runner;
