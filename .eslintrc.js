module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    mocha: true
  },
  extends: 'eslint:recommended',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    indent: [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    quotes: [
      'error',
      'single',
      { 'avoidEscape': true }
    ],
    semi: [
      'error',
      'always'
    ],
    'space-before-function-paren': [
      'error',
      'always'
    ],
    'object-curly-spacing': [
      'error',
      'always'
    ],
    'eol-last': [
      'error',
      'always'
    ]
  },
  overrides: [
      {
      files: ['**/*.ts'],
      rules: {
        'no-undef': 'off'
      }
    }
  ]
};
