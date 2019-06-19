const BROWSER = process.env.BROWSER;
const REPORT_COVERAGE = process.env.REPORT_COVERAGE || false;
const staticConfig = require('./karma.conf').staticConfig;
const customLaunchers = {
  sl_chrome_headless: {
    base: 'ChromeHeadless',
    flags: ['--no-sandbox']
  },
  sl_chrome: {
    base: 'SauceLabs',
    browserName: 'chrome',
    platform: 'Windows 10'
  },
  sl_firefox: {
    base: 'SauceLabs',
    browserName: 'firefox',
    platform: 'Windows 10'
  },
  sl_safari: {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'OS X 10.13',
    version: '12'
  },
  sl_edge: {
    base: 'SauceLabs',
    browserName: 'MicrosoftEdge',
    platform: 'Windows 10'
  },
  sl_ie_11: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 7',
    version: '11'
  },
  sl_ios_12: {
    base: 'SauceLabs',
    browserName: 'iphone',
    platform: 'iOS',
    version: '12.0'
  },
  sl_ios_11: {
    base: 'SauceLabs',
    browserName: 'iphone',
    platform: 'iOS',
    version: '11.0'
  },
  sl_android_7: {
    base: 'SauceLabs',
    browserName: 'Chrome',
    deviceName: 'Android GoogleAPI Emulator',
    platform: 'Android',
    version: '7'
  },
  sl_android_6: {
    base: 'SauceLabs',
    browserName: 'android',
    version: '6'
  },
  sl_android_5: {
    base: 'SauceLabs',
    browserName: 'android',
    version: '5.1'
  }
};

function runner (config) {
  const reporters = ['mocha', 'saucelabs'];
  if (REPORT_COVERAGE) reporters.push('coverage');

  const logLevel = config.LOG_INFO;

  config.set(Object.assign({}, staticConfig, {
    reporters,
    logLevel,
    browsers: ['sl_' + BROWSER],
    sauceLabs: {
      testName: 'Recurly.js tests',
      recordVideo: true,
      public: 'public'
    },
    customLaunchers
  }));
};

const server = require('./test/server');

module.exports = runner;
