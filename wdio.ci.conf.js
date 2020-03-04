const { spawnSync } = require('child_process');
const branchName = require('current-git-branch');
const defaultConfig = require('./wdio.conf').config;
const {
  project: projectName,
  customLaunchers
} = require('./test/conf/browserstack');

const {
  BROWSER,
  BROWSER_STACK_USERNAME: user,
  BROWSER_STACK_ACCESS_KEY: key,
  TRAVIS_BUILD_NUMBER
} = process.env;
const localIdentifier = `${Math.round(Math.random() * 100)}-${Date.now()}`;

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
        toW3C(customLaunchers[`bs_${BROWSER || 'chrome'}`]),
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
      captureTimeout: 15000,
      newCommandTimeout: 15000,
      pollingTimeout: 15000,
      timeout: 15000
    }
  ],
  baseUrl: 'http://bs-local.com:9877',
  services: [
    ['browserstack']
  ]
});

delete config.path;

function toW3C (launcher) {
  const capabilities = Object.assign({}, launcher);
  const translations = {
    browserName: 'browser',
    browserVersion: 'browser_version',
    deviceName: 'device',
    osVersion: 'os_version',
    realMobile: 'real_mobile'
  };
  for (const [newCap, oldCap] of Object.entries(translations)) {
    if (capabilities[oldCap]) {
      delete Object.assign(capabilities, { [newCap]: capabilities[oldCap] })[oldCap];
    }
  }
  delete capabilities.base;
  delete capabilities['browserstack.safari.enablePopups'];
  delete capabilities['browserstack.edge.enablePopups'];
  delete capabilities['browserstack.ie.enablePopups'];
  return capabilities;
}
