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
    platform: 'OS X 10.10'
  },
  sl_ie_10: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 7',
    version: '10'
  },
  sl_ie_11: {
    base: 'SauceLabs',
    browserName: 'internet explorer',
    platform: 'Windows 7',
    version: '11'
  },
  sl_ios_11: {
    base: 'SauceLabs',
    browserName: 'iphone',
    platform: 'iOS',
    version: '11.0'
  },
  sl_ios_10: {
    base: 'SauceLabs',
    browserName: 'iphone',
    platform: 'iOS',
    version: '10.3'
  },
  sl_ios_9: {
    base: 'SauceLabs',
    browserName: 'iphone',
    version: '9.3'
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

module.exports = function (config) {
  config.set(Object.assign({}, staticConfig, {
    reporters: ['mocha', 'saucelabs'],
    logLevel: config.LOG_INFO,
    browsers: browsers(),
    sauceLabs: {
      testName: 'Recurly.js tests',
      recordVideo: true,
      public: 'public'
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
