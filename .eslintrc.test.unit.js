const config = require('./.eslintrc');

module.exports = {
  ...config,
  env: {
    ...config.env,
    mocha: true
  },
  globals: {
    sinon: 'readonly'
  },
  plugins: [...config.plugins, 'no-only-tests'],
  rules: {
    ...config.rules,
    'no-only-tests/no-only-tests': 'error'
  }
};
