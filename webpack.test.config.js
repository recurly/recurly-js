var ExtractTextPlugin = require("extract-text-webpack-plugin");
var glob = require('glob');
var path = require('path');

var plugins = ['transform-object-assign'];
if (shouldInstrument()) {
  plugins.push(['istanbul', { 'exclude': ['test/*'] }]);
}

module.exports = {
  entry: glob.sync('./test/**/*.test.js'),
  output: {
    path: path.join(__dirname, 'build'),
    publicPath: '/build/',
    filename: 'test.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              presets: ['es2015'],
              plugins: plugins
            }
          }
        ]
      },
      {
        test: /\.json$/,
        use: 'json-loader'
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader'
        })
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json'],
    modules: [
      path.join(__dirname, 'test'),
      'node_modules'
    ]
  },
  plugins: [
    new ExtractTextPlugin('recurly.css')
  ],
  devtool: 'inline-source-map'
};

// Only instrument in CI if we're set to report coverage
function shouldInstrument () {
  if (process.env.TRAVIS_JOB_ID) {
    return !!process.env.REPORT_COVERAGE;
  }
  return true;
}
