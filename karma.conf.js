const {
  BROWSER,
  VIRTUALBOX_EDGE_UUID,
  VIRTUALBOX_IE11_UUID,
  ANDROID_HOME,
  ANDROID_AVD_NAME
} = process.env;

const staticConfig = {
  basePath: '',
  frameworks: ['mocha', 'sinon', 'source-map-support'],
  files: [
    'build/recurly.js',
    'build/test-unit.js'
  ],
  proxies: {
    '/api': 'http://localhost:9877'
  },
  hostname: (BROWSER.includes('Android') ? '10.0.2.2' : 'localhost'),
  reporters: ['mocha', 'coverage'],
  port: 9876,
  colors: true,
  autoWatch: true,
  browsers: [BROWSER || 'ChromeHeadless'],
  singleRun: true,
  concurrency: Infinity,
  browserDisconnectTimeout: 800000,
  browserDisconnectTolerance : 4,
  browserNoActivityTimeout: 800000,
  captureTimeout: 800000,
  customLaunchers: {
    ChromeDebug: {
      base: 'Chrome',
      flags: ['--auto-open-devtools-for-tabs']
    },
    FirefoxDebug: {
      base: 'Firefox',
      flags: ['--devtools']
    },
    VirtualBoxEdgeWin10: {
      base: 'VirtualBoxEdge',
      keepAlive: true,
      uuid: VIRTUALBOX_EDGE_UUID
    },
    VirtualBoxIE11Win7: {
      base: 'VirtualBoxIE11',
      keepAlive: true,
      uuid: VIRTUALBOX_IE11_UUID
    },
    Android10: {
      base: 'AndroidEmulator',
      avdName: ANDROID_AVD_NAME || 'Pixel_3_API_29',
      sdkHome: ANDROID_HOME
    }
  },
  client: {
    captureConsole: true,
    mocha: {
      timeout: 7000 // 7 seconds
    }
  },
  coverageReporter: {
    dir : 'build/reports/',
    reporters: [
      // { type: 'html', subdir: 'coverage' }
      { type: 'lcovonly', subdir: 'coverage', file: 'lcov.info' }
    ]
  }
};

function runner (config) {
  config.set(Object.assign({}, staticConfig, { logLevel: config.LOG_INFO }));
}

const server = require('./test/server');

runner.staticConfig = staticConfig;

module.exports = runner;
