var staticConfig = {
  basePath: '',
  frameworks: ['mocha', 'fixture', 'sinon', 'phantomjs-shim', 'source-map-support'],
  files: [
    'build/recurly.js',
    'build/test.js',
    { pattern: 'test/support/fixtures/*' },
  ],
  proxies: { '/api': 'http://localhost:9877' },
  preprocessors: {
    'test/support/fixtures/*.html': ['html2js'],
    'test/support/fixtures/*.json': ['json_fixtures']
  },
  jsonFixturesPreprocessor: {
    variableName: '__json__'
  },
  reporters: ['mocha'],
  port: 9876,
  colors: true,
  autoWatch: true,
  browsers: ['PhantomJS'],
  singleRun: true,
  concurrency: Infinity,
  browserDisconnectTimeout: 300000, // 5 minutes
  browserNoActivityTimeout: 300000,
  captureTimeout: 300000
};

var runner = function (config) {
  config.set(Object.assign({}, staticConfig, {
    logLevel: config.LOG_INFO
  }));
};

var server = require('./test/server');

runner.staticConfig = staticConfig;

module.exports = runner;
