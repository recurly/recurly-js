const { spawnSync } = require('child_process');
const branchName = require('current-git-branch');
const { config: defaultConfig, isMobile, imageComparisonService } = require('./wdio.conf');
const {
  projectName,
  capabilities: browserStackCapabilities
} = require('./test/conf/browserstack');

const {
  BROWSER = 'BrowserStackChrome',
  BROWSER_STACK_USERNAME: user,
  BROWSER_STACK_ACCESS_KEY: key,
  TRAVIS_BUILD_NUMBER
} = process.env;

const BROWSER_STACK_CAPABILITY = browserStackCapabilities[BROWSER];
const localIdentifier = `${Math.round(Math.random() * 100)}-${Date.now()}`;
const { timeout } = defaultConfig.mochaOpts;

spawnSync('mkdir', ['-p', 'build/reports/e2e/log'] );

const services = [
  ['browserstack', {
    browserstackLocal: true,
    opts: {
      logfile: 'build/reports/e2e/log/browserstack.log',
      localIdentifier
    }
  }],
  imageComparisonService()
]

if (BROWSER === 'Electron') {
  exports.config = defaultConfig;
} else {
  const config = exports.config = Object.assign({}, defaultConfig, {
    user,
    key,
    capabilities: [
      {
        'bstack:options': Object.assign(
          {},
          BROWSER_STACK_CAPABILITY,
          {
            projectName,
            buildName: `${TRAVIS_BUILD_NUMBER || `Local e2e [${branchName()}]`}`,
            seleniumVersion: '3.141.59',
            appiumVersion: '1.17.0',
            local: true,
            debug: true,
            networkLogs: true,
            consoleLogs: 'verbose',
            localIdentifier
          }
        ),
        'browserstack.use_w3c': true,
        captureTimeout: timeout,
        pollingTimeout: timeout,
        timeout
      }
    ],
    baseUrl: 'http://bs-local.com:9877',
    maxInstances: 1,
    services,
    onPrepare: () => {
      if (isMobile()) {
        process.env.API_PROXY = 'http://bs-local.com:9877/api-proxy';
      }
      require('./test/server');
    }
  });

  delete config.path;
}
