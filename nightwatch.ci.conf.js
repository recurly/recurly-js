const defaultConfig = require('./nightwatch.conf');
const { BROWSER } = process.env;

const host = 'hub-cloud.browserstack.com';
const port = 80;

const config = Object.assign({}, defaultConfig, {
  launch_url: 'http://bs-local.com:9877/e2e',
  selenium : {
    start_process: false,
    host,
    port
  }
});

delete config.webdriver;
delete config.test_settings.default.webdriver;
config.test_settings.default.selenium_host = host;
config.test_settings.default.selenium_port = port;

Object.assign(config.test_settings.default.desiredCapabilities, {
  build: 'recurly-js',
  'browserstack.user': process.env.BROWSER_STACK_USERNAME,
  'browserstack.key': process.env.BROWSER_STACK_ACCESS_KEY,
  'browserstack.debug': true
});

console.log(config);

module.exports = config;

// TODO: kill server when tests complete
const server = require('./test/server');
