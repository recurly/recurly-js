const config = require('./.eslintrc');

module.exports = {
  ...config,
  env: {
    ...config.env,
    mocha: true
  },
  globals: {
    $: 'readonly',
    browser: 'readonly',
    driver: 'readonly',
    recurly: 'readonly'
  }
};
