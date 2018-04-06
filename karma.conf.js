var staticConfig = {
  basePath: '',
  frameworks: ['mocha', 'sinon', 'phantomjs-shim', 'source-map-support'],
  files: [
    'build/recurly.js',
    'build/test.js'
  ],
  proxies: { '/api': 'http://localhost:9877' },
  reporters: ['mocha', 'coverage'],
  port: 9876,
  colors: true,
  autoWatch: true,
  browsers: [
    'PhantomJS'
    // 'ChromeDebug'
    // 'IE11 - Win7'
  ],
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
    }
  },
  client: {
    captureConsole: true,
    mocha: {
      timeout : 800000, // 800 seconds
      grep: ''
    }
  },
  coverageReporter: {
    type : 'html',
    dir : 'build/reports/coverage/'
  }
};

var runner = function (config) {
  config.set(Object.assign({}, staticConfig, {
    logLevel: config.LOG_INFO
  }));
};

var server = require('./test/server');

runner.staticConfig = staticConfig;

module.exports = runner;
