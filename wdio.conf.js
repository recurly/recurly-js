const { spawn } = require('child_process');
const path = require('path');
const { capabilities: bsCapabilities } = require('./test/conf/browserstack');

const {
  API,
  API_PROXY,
  BROWSER,
  DEBUG,
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
      implicit: Math.round(timeout() * 1/3)
    });
  }
}, assignPort());

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
      'appium:deviceName': 'iPhone 11 Pro',
      'appium:platformVersion': bsCapabilities[`bs_${BROWSER}`].osVersion,
      'appium:orientation': 'PORTRAIT',
      'appium:automationName': 'XCUITest',
    }];
  }

  if (isAndroid()) {
    return [{
      platformName: 'Android',
      browserName: 'Chrome',
      'appium:deviceName': 'Android Emulator',
      'appium:platformVersion': bsCapabilities[`bs_${BROWSER}`].osVersion,
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
  return 15000;
}

function onPrepare () {
  if (isMobile()) {
    process.env.API_PROXY = `${baseUrl()}/api-proxy`;
  }
  require('./test/server');
}

function services () {
  if (browserName() === 'firefox') {
    return ['geckodriver'];
  }

  if (isMobile()) {
    return [['appium', {
      logPath : './build/reports/e2e/log/'
    }]];
  }

  return ['chromedriver'];
}

function assignPort () {
  if (isMobile()) return { port: 4723 };
}

function browserName () {
  if (DEBUG || isElectron() || isAndroid()) return 'chrome';
  if (isIos()) return 'safari';
  return BROWSER || 'chrome';
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
  return BROWSER.includes('ios');
}

function isAndroid () {
  return BROWSER.includes('android')
}

function isElectron () {
  return BROWSER === 'electron';
}
