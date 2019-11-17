const staticConfig = {
  basePath: '',
  frameworks: ['mocha', 'sinon', 'source-map-support'],
  files: [
    'build/recurly.js',
    'build/test.js'
  ],
  proxies: {
    '/api': 'http://localhost:9877'
  },
  reporters: ['mocha', 'coverage'],
  port: 9876,
  colors: true,
  autoWatch: true,
  browsers: [process.env.BROWSER || 'ChromeHeadless'],
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
      uuid: process.env.VIRTUALBOX_EDGE_UUID
    },
    VirtualBoxIE11Win7: {
      base: 'VirtualBoxIE11',
      keepAlive: true,
      uuid: process.env.VIRTUALBOX_IE11_UUID
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
      // { type: 'html', subdir : 'coverage' },
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
