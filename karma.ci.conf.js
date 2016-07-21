var BROWSER = process.env.BROWSER || 'all';
var staticConfig = require('./karma.conf').staticConfig;
var sauceBrowsers = {
  sl_phantom: {
    base: 'PhantomJS'
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
    platform: 'OS X 10.11'
  },
  sl_ie_10: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    version: '10'
  },
  sl_ie_11: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 10',
    version: '11'
  },
  sl_opera: {
    base: 'SauceLabs',
    browserName: 'opera'
  },
  sl_ios_9_2: {
    base: 'SauceLabs',
    browserName: 'iphone',
    version: '9.2'
  },
  sl_android_5_1: {
    base: 'SauceLabs',
    browserName: 'android',
    version: '5.1'
  }
};

module.exports = function (config) {
  config.set(Object.assign({}, staticConfig, {
    reporters: ['mocha', 'saucelabs'],
    logLevel: config.LOG_INFO,
    browsers: browsers(),
    sauceLabs: {
      testName: 'Recurly.js tests',
      recordVideo: true
    },
    customLaunchers: sauceBrowsers,
  }));
};

function browsers () {
  if (BROWSER) {
    return ['sl_' + BROWSER];
  } else {
    return Object.keys(sauceBrowsers);
  }
}

var server = require('./test/server');
