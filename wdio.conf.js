const { spawn } = require('child_process');
const path = require('path');
const {
  capabilities: browserStackCapabilities
} = require('./test/conf/browserstack');

const {
  API,
  API_PROXY,
  BROWSER = 'Chrome-Remote',
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
      script: timeout()
    });
  }
}, assignPort());

exports.isMobile = isMobile;
exports.visualService = visualService;

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
  require('@recurly/public-api-test-server');
}

function services () {
  const definition = [];

  if (browserName() === 'firefox') {
    definition.push('geckodriver');
  } else {
    definition.push('chromedriver');
  }

  definition.push(visualService());

  return definition;
}

/**
 * Configuration options for wdio-image-comparison-service
 * @see https://github.com/wswebcreation/webdriver-image-comparison/blob/master/docs/OPTIONS.md#plugin-options
 */
function visualService () {
  const service = [
    'visual',
    {
      baselineFolder: path.resolve(__dirname, './test/e2e/support/visual-baseline'),
      formatImageName: `${BROWSER}/{tag}-{width}x{height}`,
      screenshotPath: path.resolve(__dirname, 'tmp'),
      savePerInstance: true
    }
  ];

  return service;
}

function assignPort () {
  if (isMobile() && isLocal()) return { port: 4723 };
}

function browserName () {
  if (DEBUG || isAndroid()) return 'chrome';
  if (isIos()) return 'safari';
  return BROWSER;
}

function chromeOptions () {
  if (DEBUG) {
    return {
      args: ['--auto-open-devtools-for-tabs']
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

function isLocal () {
  return !browserStackCapabilities[BROWSER];
}
