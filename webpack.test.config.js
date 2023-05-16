const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const glob = require('glob');
const path = require('path');

const moduleConfig = require('./webpack.config').module;

if (shouldInstrument()) {
  moduleConfig.rules.find(rule => {
    const loader = rule.use.find(use => use.loader === 'babel-loader')
    if (!loader) return;
    loader.options.plugins.push('istanbul');
  });
}

module.exports = {
  entry: glob.sync('./test/unit/**/*.test.js'),
  mode: 'development',
  output: {
    path: path.join(__dirname, 'build'),
    publicPath: '/build/',
    filename: 'test-unit.js'
  },
  module: moduleConfig,
  resolve: {
    extensions: ['.js', '.json'],
    modules: [
      path.join(__dirname, 'test'),
      'node_modules'
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'recurly.css' }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],
  devtool: 'inline-source-map'
};

// Only instrument in CI if we're set to report coverage
function shouldInstrument () {
  if (process.env.CI) {
    return !!process.env.REPORT_COVERAGE;
  }
  return true;
}
