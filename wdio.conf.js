const { spawn } = require('child_process');

const { BROWSER, API, API_PROXY, PUBLIC_KEY } = process.env;

exports.config = {
  runner: 'local',
  path: '/',
  specs: [
    './test/e2e/**/*.test.js'
  ],
  maxInstances: 5,
  capabilities: [{
    browserName: BROWSER || 'chrome',
  }],
  logLevel: 'info',
  baseUrl: 'http://localhost:9877',
  waitforTimeout: 10000,
  connectionRetryCount: 3,
  services: ['chromedriver'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 10000
  },
  onPrepare: (config, capabilities) => {
    const server = require('./test/server');
  },
  before: () => {
    global.testEnvironment = { API, API_PROXY, PUBLIC_KEY };
    browser.setTimeout({ script: 10000 });
  }
};
