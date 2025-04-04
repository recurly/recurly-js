const { spawnSync } = require('child_process');
const branchName = require('current-git-branch');
const { config: defaultConfig, isMobile, visualService } = require('./wdio.conf');
const {
  projectName,
  capabilities: browserStackCapabilities
} = require('./test/conf/browserstack');

const {
  BROWSER = 'Chrome-Remote',
  BROWSER_STACK_USERNAME: user,
  BROWSER_STACK_ACCESS_KEY: key,
  GITHUB_RUN_ID
} = process.env;

const BROWSER_STACK_CAPABILITY = browserStackCapabilities[BROWSER];
const localIdentifier = `${Math.round(Math.random() * 100)}-${Date.now()}`;
const { timeout } = defaultConfig.mochaOpts;

spawnSync('mkdir', ['-p', 'build/reports/e2e/log'] );

const services = [
  [
    'browserstack',
    {
      browserstackLocal: true,
      opts: {
        logfile: 'build/reports/e2e/log/browserstack.log',
        localIdentifier
      }
    }
  ],
  visualService()
]

const config = exports.config = Object.assign({}, defaultConfig, {
  user,
  key,
  capabilities: [
    {
      browserName: BROWSER_STACK_CAPABILITY.browserName,
      'bstack:options': Object.assign(
        {},
        BROWSER_STACK_CAPABILITY,
        {
          projectName,
          buildName: `${GITHUB_RUN_ID || `Local e2e [${branchName()}]`}`,
          seleniumVersion: '3.141.59',
          appiumVersion: '1.17.0',
          local: true,
          debug: true,
          networkLogs: true,
          consoleLogs: 'verbose',
          localIdentifier
        }
      )
    }
  ],
  baseUrl: 'http://bs-local.com:9877',
  maxInstances: 1,
  services,
  onPrepare: () => {
    if (isMobile()) {
      process.env.API_PROXY = 'http://bs-local.com:9877/api-proxy';
    }
    require('@recurly/public-api-test-server');
  }
});

delete config.path;
