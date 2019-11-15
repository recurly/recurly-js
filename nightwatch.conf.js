const { spawnSync } = require('child_process');
const { BROWSER: browserName } = process.env;

spawnSync('mkdir', ['-p', 'build/reports/e2e/log'] );

const recurlyJsConfig = {
  publicKey: 'ewr1-zfJT5nPe1qW7jihI32LIRH'
};

const browserConfig = {
  chrome: {
    webdriver: {
      server_path: 'node_modules/.bin/chromedriver',
      port: 9515
    },
    desiredCapabilities : {
      browserName : 'chrome',
      'chromeOptions': {
        args: ['--no-sandbox']
      },
    }
  },
  firefox: {
    webdriver: {
      server_path: 'node_modules/.bin/geckodriver',
      port: 4444
    },
    desiredCapabilities : {
      browserName : 'firefox'
    }
  }
};

const config = {
  src_folders : ['test/e2e'],
  launch_url: `http://localhost:9877/e2e?config=${JSON.stringify(recurlyJsConfig)}`,
  output_folder: 'build/reports/e2e',
  webdriver: {
    start_process: true,
    log_path: 'build/reports/e2e/log'
  },
  test_settings: {
    default: { ...browserConfig[browserName || 'chrome'] }
  }
};

module.exports = config;
