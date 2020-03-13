const { spawnSync } = require('child_process');
const branchName = require('current-git-branch');
const defaultConfig = require('./wdio.conf').config;
const {
  projectName,
  capabilities
} = require('./test/conf/browserstack');

const {
  BROWSER,
  BROWSER_STACK_USERNAME: user,
  BROWSER_STACK_ACCESS_KEY: key,
  TRAVIS_BUILD_NUMBER
} = process.env;
const localIdentifier = `${Math.round(Math.random() * 100)}-${Date.now()}`;
const { timeout } = defaultConfig.mochaOpts;

spawnSync('mkdir', ['-p', 'build/reports/e2e/log'] );

const config = exports.config = Object.assign({}, defaultConfig, {
  user,
  key,
  browserstackLocal: true,
  browserstackOpts: {
    logfile: 'build/reports/e2e/log/browserstack.log',
    localIdentifier
  },
  capabilities: [
    {
      'bstack:options': Object.assign(
        {},
        capabilities[`bs_${BROWSER || 'chrome'}`],
        {
          projectName,
          buildName: `${TRAVIS_BUILD_NUMBER || `Local e2e [${branchName()}]`}`,
          seleniumVersion: '3.141.59',
          appiumVersion: '1.16.0',
          local: true,
          debug: true,
          networkLogs: true,
          consoleLogs: 'verbose',
          localIdentifier
        }
      ),
      'browserstack.use_w3c': true,
      captureTimeout: timeout,
      newCommandTimeout: timeout,
      pollingTimeout: timeout,
      timeout
    }
  ],
  baseUrl: 'http://bs-local.com:9877',
  services: [
    ['browserstack']
  ]
});

delete config.path;
