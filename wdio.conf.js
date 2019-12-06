const { BROWSER } = process.env;

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
    timeout: 60000
  },
  onPrepare: (config, capabilities) => {
    const server = require('./test/server');
  }
};
