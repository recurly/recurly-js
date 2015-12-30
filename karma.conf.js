module.exports = function (config) {
  config.set({
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
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: true,
    concurrency: Infinity
  });
};

var server = require('./test/server');
