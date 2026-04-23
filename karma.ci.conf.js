const browserstack = require('browserstack-local');
const branchName = require('current-git-branch');
const staticConfig = require('./karma.conf').staticConfig;
const {
  capabilities: browserStackCapabilities,
  projectName: project
} = require('./test/conf/browserstack');

const {
  BROWSER = 'Chrome',
  REPORT_COVERAGE = false,
  GITHUB_RUN_ID,
  BROWSER_STACK_USERNAME,
  BROWSER_STACK_ACCESS_KEY
} = process.env;
const LOCAL_IDENTIFIER = `${Math.round(Math.random() * 100)}-${Date.now()}`;
const browserStackLocal = new browserstack.Local();
const BROWSER_STACK_CAPABILITY = browserStackCapabilities[BROWSER];

function runner (config) {
  const cfg = Object.assign({}, staticConfig, {
    reporters: ['mocha'],
    logLevel: config.LOG_DEBUG,
    browsers: [BROWSER],
    customLaunchers: customLaunchers(),
    hostname: hostname()
  });

  if (REPORT_COVERAGE) {
    cfg.reporters.push('coverage');
  }

  if (BROWSER_STACK_CAPABILITY) {
    cfg.captureTimeout = 120000;
    cfg.browserNoActivityTimeout = 120000;
  }

  console.log(cfg);

  config.set(cfg);
}

require('@recurly/public-api-test-server');

browserStackLocal.start({ key: BROWSER_STACK_ACCESS_KEY, localIdentifier: LOCAL_IDENTIFIER }, () => {
  if (browserStackLocal.isRunning()) {
    console.log(`BrowserStack Local initialized`);
  } else {
    console.warn(`BrowserStack Local not initialized`);
  }
});

module.exports = runner;

function customLaunchers () {
  const launchers = {
    ChromeHeadlessCI: {
      base: 'ChromeHeadless',
      flags: ['--no-sandbox']
    }
  };

  if (BROWSER_STACK_CAPABILITY) {
    launchers[BROWSER] = toLauncherConfig(BROWSER_STACK_CAPABILITY);
  }

  return launchers;
}

function toLauncherConfig (capability) {
  const { browserName, browserVersion, os, osVersion, deviceName, realMobile, safari, edge } = capability;

  return {
    base: 'WebDriver',
    config: {
      hostname: 'hub.browserstack.com',
      port: 80,
      path: '/wd/hub',
      user: BROWSER_STACK_USERNAME,
      pwd: BROWSER_STACK_ACCESS_KEY
    },
    browserName,
    ...(browserVersion && { browserVersion }),
    'bstack:options': {
      userName: BROWSER_STACK_USERNAME,
      accessKey: BROWSER_STACK_ACCESS_KEY,
      projectName: project,
      buildName: `${GITHUB_RUN_ID || `local unit [${branchName()}]`}`,
      autoAcceptAlerts: true,
      local: true,
      localIdentifier: LOCAL_IDENTIFIER,
      debug: true,
      consoleLogs: 'verbose',
      networkLogs: true,
      ...(os && { os }),
      ...(osVersion && { osVersion }),
      ...(deviceName && { deviceName }),
      ...(realMobile !== undefined && { realMobile }),
      ...(safari && { safari }),
      ...(edge && { edge })
    }
  };
}

function hostname () {
  if (BROWSER_STACK_CAPABILITY) return 'bs-local.com';
  return 'localhost';
}
