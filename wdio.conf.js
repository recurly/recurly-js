const { spawn } = require('child_process');

const {
  API,
  API_PROXY,
  BROWSER,
  DEBUG,
  PUBLIC_KEY
} = process.env;

let browserName = BROWSER || 'chrome';
let timeout = 15000;
let execArgv = [];
let chromeOptions = {
  args: ['--headless']
};

if (DEBUG) {
  browserName = 'chrome';
  timeout = 24 * 60 * 60 * 1000;
  execArgv.concat(['--inspect']);
  chromeOptions.args = ['--auto-open-devtools-for-tabs'];
}

exports.timeout = timeout;
exports.config = {
  runner: 'local',
  path: '/',
  specs: [
    './test/e2e/**/*.test.js'
  ],
  maxInstances: 1,
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
    timeout: timeout * 4
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
