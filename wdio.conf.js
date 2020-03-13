const { spawn } = require('child_process');

const {
  API,
  API_PROXY,
  BROWSER,
  DEBUG,
  PUBLIC_KEY
} = process.env;

let browserName = BROWSER || 'chrome';
let maxInstances = 5;
let timeout = 15000;
let execArgv = [];
let chromeOptions = {};

if (DEBUG) {
  browserName = 'chrome';
  maxInstances = 1;
  timeout = 24 * 60 * 60 * 1000;
  execArgv.concat(['--inspect']);
  chromeOptions.args = ['--auto-open-devtools-for-tabs'];
}

exports.config = {
  runner: 'local',
  path: '/',
  specs: [
    './test/e2e/**/*.test.js'
  ],
  maxInstances,
  capabilities: [{ browserName, 'goog:chromeOptions': chromeOptions }],
  execArgv,
  logLevel: 'info',
  baseUrl: 'http://localhost:9877',
  waitforTimeout: Math.round(timeout * 2/3),
  connectionRetryCount: 3,
  services: ['chromedriver'],
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

console.log(exports.config);
