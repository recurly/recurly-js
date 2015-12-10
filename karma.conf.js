module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['mocha'],
    files: ['build/test.js'],
    preprocessors: {},
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: false,
    concurrency: Infinity
  });
};
