const { spawn } = require('child_process');
const path = require('path');
const { capabilities: bstackCapabilities } = require('./test/conf/browserstack');

const {
  API,
  API_PROXY,
  BROWSER,
  DEBUG,
  PUBLIC_KEY
} = process.env;

let port;
let browserName = BROWSER || 'chrome';
let capabilities;
let services = ['chromedriver'];
let maxInstances = 5;
let timeout = 15000;
let execArgv = [];
let chromeOptions = {};
let firefoxOptions = {};

if (DEBUG) {
  browserName = 'chrome';
  maxInstances = 1;
  timeout = 24 * 60 * 60 * 1000;
  execArgv.concat(['--inspect']);
  chromeOptions.args = ['--auto-open-devtools-for-tabs'];
  firefoxOptions.args = ['-jsconsole'];
}

if (BROWSER === 'electron') {
  browserName = 'chrome';
  chromeOptions.binary = path.resolve(__dirname, "node_modules/.bin/electron");
}

if (browserName === 'firefox') {
  services = ['geckodriver'];
}

if (browserName.includes('ios')) {
  services = [
    ['appium', {
      logPath : './build/reports/e2e/log/'
    }]
  ];
  port = 4723;
  capabilities = [{
    maxInstances: 1,
    platformName: 'iOS',
    browserName: 'safari',
    'appium:deviceName': 'iPhone 11 Pro',
    'appium:platformVersion': bstackCapabilities[`bs_${browserName}`].osVersion,
    'appium:orientation': 'PORTRAIT',
    'appium:automationName': 'XCUITest',
    // 'appium:newCommandTimeout': 240,
  }];
}

exports.config = {
  runner: 'local',
  path: '/',
  specs: [
    './test/e2e/**/*.test.js'
  ],
  maxInstances,
  capabilities: capabilities || [{
    browserName,
    'goog:chromeOptions': chromeOptions,
    'moz:firefoxOptions': firefoxOptions
  }],
  execArgv,
  logLevel: 'info',
  baseUrl: 'http://localhost:9877',
  waitforTimeout: Math.round(timeout * 2/3),
  connectionRetryCount: 3,
  services,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout
  },
  onPrepare: (config, capabilities) => {
    const server = require('./test/server');
  },
  before: () => {
    global.testEnvironment = { API, API_PROXY, PUBLIC_KEY };
    browser.setTimeout({
      script: timeout,
      implicit: Math.round(timeout * 1/3)
    });
  }
};

if (port) {
  exports.config.port = port;
}
