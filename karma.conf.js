module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'sinon', 'phantomjs-shim', 'source-map-support'],
    files: ['build/recurly.js', 'build/test.js'],
    proxies: { '/api': 'http://localhost:9877' },
    preprocessors: {},
    reporters: ['mocha'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: false,
    concurrency: Infinity
  });
};

var server = require('./test/server');
