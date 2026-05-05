'use strict';

const pkg = require('../../package.json');

function babelOptions ({ instrument } = {}) {
  return {
    babelrc: false,
    configFile: false,
    sourceMaps: false,
    inputSourceMap: false,
    plugins: [
      '@babel/plugin-transform-object-assign',
      '@babel/plugin-proposal-class-properties',
      ...(instrument ? ['istanbul'] : []),
    ],
    presets: [
      ['@babel/preset-env', { targets: { browsers: pkg.browserslist } }],
    ],
  };
}

module.exports = { babelOptions };
