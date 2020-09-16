const { spawn } = require('child_process');
const path = require('path');
const {
  capabilities: browserStackCapabilities
} = require('./test/conf/browserstack');

const {
  API,
  API_PROXY,
  BROWSER = 'chrome',
  BROWSER_VERSION,
  DEBUG = false,
  PUBLIC_KEY
} = process.env;

exports.config = Object.assign({
  runner: 'local',
  path: '/',
  specs: [
    './test/e2e/**/*.test.js'
  ],
  maxInstances: maxInstances(),
  capabilities: capabilities(),
  execArgv: execArgv(),
  logLevel: 'info',
  baseUrl: baseUrl(),
  waitforTimeout: Math.round(timeout() * 2/3),
  connectionRetryCount: 3,
  services: services(),
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: timeout()
  },
  onPrepare,
  before: async () => {
    global.testEnvironment = { API, API_PROXY, PUBLIC_KEY };
    await browser.setTimeout({
      script: timeout(),
      // implicit: Math.round(timeout() * 1/3)
    });
  }
}, assignPort());

exports.isMobile = isMobile;
exports.imageComparisonService = imageComparisonService;

// attributes

function maxInstances () {
  if (DEBUG || isMobile()) {
    return 1;
  } else {
    return 5;
  }
}

function capabilities () {
  if (isIos()) {
    return [{
      platformName: 'iOS',
      browserName: 'Safari',
      'appium:deviceName': 'iPhone 11',
      'appium:platformVersion': BROWSER_VERSION || '13.6',
      'appium:orientation': 'PORTRAIT',
      'appium:automationName': 'XCUITest',
    }];
  }

  if (isAndroid()) {
    return [{
      platformName: 'Android',
      browserName: 'Chrome',
      'appium:deviceName': 'Android Emulator',
      'appium:platformVersion': BROWSER_VERSION || '10.0',
      'appium:automationName': 'UIAutomator2',
      'appium:chromedriver_autodownload': true
    }];
  }

  return [{
    browserName: browserName(),
    'goog:chromeOptions': chromeOptions(),
    'moz:firefoxOptions': firefoxOptions()
  }];
}

function execArgv () {
  if (DEBUG) {
    return ['--inspect'];
  }
  return [];
}

function baseUrl () {
  if (isAndroid()) return 'http://10.0.2.2:9877';
  return 'http://localhost:9877';
}

function timeout () {
  if (DEBUG) return 24 * 60 * 60 * 1000;
  return 120000;
}

function onPrepare () {
  if (isMobile()) {
    process.env.API_PROXY = `${baseUrl()}/api-proxy`;
  }
  require('./test/server');
}

function services () {
  const definition = [];

  if (browserName() === 'firefox') {
    definition.push('geckodriver');
  } else if (isMobile()) {
    definition.push(['appium', {
      logPath : './build/reports/e2e/log/'
    }]);
  } else {
    definition.push('chromedriver');
  }

  definition.push(imageComparisonService());

  return definition;
}

/**
 * Configuration options for wdio-image-comparison-service
 * @see https://github.com/wswebcreation/webdriver-image-comparison/blob/master/docs/OPTIONS.md#plugin-options
 */
function imageComparisonService () {
  const service = [
    'image-comparison',
    {
      baselineFolder: path.resolve(__dirname, './test/e2e/support/snapshots'),
      // path to dump screenshots taken during tests
      screenshotPath: path.resolve(__dirname, './tmp'),
      // Output diff if a visual regression test is failing
      diffPath: path.resolve(__dirname, './tmp/diff'),
      formatImageName: `${BROWSER}/{tag}-{width}x{height}`,
      // Save screenshots on every test run in screenshotPath dir
      savePerInstance: true,
      // Needs to be false to prevent false positives in CI.
      // Change to true and remove snapshots to generate new baselines
      autoSaveBaseline: false,
      blockOutStatusBar: true,
      blockOutToolBar: true,
    }
  ]

  return service;
}

function assignPort () {
  if (isMobile() && isLocal()) return { port: 4723 };
}

function browserName () {
  if (DEBUG || isElectron() || isAndroid()) return 'chrome';
  if (isIos()) return 'safari';
  return BROWSER;
}

function chromeOptions () {
  if (DEBUG) {
    return {
      args: ['--auto-open-devtools-for-tabs']
    };
  }
  if (isElectron()) {
    return {
      binary: path.resolve(__dirname, 'node_modules/.bin/electron')
    };
  }
  return {};
}

function firefoxOptions () {
  if (DEBUG) {
    return {
      args: ['-jsconsole']
    };
  }
  return {};
}

// utilities

function isMobile () {
  return isIos() || isAndroid();
}

function isIos () {
  return BROWSER.toLowerCase().includes('ios') || BROWSER === 'MobileSafari';
}

function isAndroid () {
  return BROWSER.toLowerCase().includes('android');
}

function isElectron () {
  return BROWSER.toLowerCase() === 'electron';
}

function isLocal () {
  return !browserStackCapabilities[BROWSER];
}
