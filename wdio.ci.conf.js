const { spawnSync } = require('child_process');
const branchName = require('current-git-branch');
const defaultConfig = require('./wdio.conf').config;
const {
  project,
  customLaunchers
} = require('./test/conf/browserstack');

const {
  BROWSER,
  BROWSER_STACK_USERNAME: user,
  BROWSER_STACK_ACCESS_KEY: key,
  TRAVIS_BUILD_NUMBER
} = process.env;

spawnSync('mkdir', ['-p', 'build/reports/e2e/log'] );

const config = exports.config = Object.assign({}, defaultConfig, {
  user,
  key,
  browserstackLocal: true,
  browserstackOpts: {
    logfile: 'build/reports/e2e/log/browserstack.log'
  },
  capabilities: [
    Object.assign(
      customLaunchers[`bs_${BROWSER || 'chrome'}`],
      {
        project,
        build: `${TRAVIS_BUILD_NUMBER || `Local e2e [${branchName()}]`}`,
        selenium_version: '3.141.59',
        'browserstack.debug': true,
        'browserstack.local': true,
        'browserstack.console': 'verbose',
        'browserstack.networkLogs': true,
        captureTimeout: 1200,
        pollingTimeout: 4000,
        timeout: 1200
      }
    )
  ],
  baseUrl: 'http://bs-local.com:9877',
  services: ['browserstack']
});

delete config.path;
