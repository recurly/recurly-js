var glob = require('glob');
var path = require('path');

const entry = [].concat(
  glob.sync('./test/*.test.js'),
  glob.sync('./test/**/*.test.js')
);

module.exports = {
  entry,
  output: {
    path: path.join(__dirname, 'build'),
    publicPath: '/build/',
    filename: 'test.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          cacheDirectory: true,
          presets: ['es2015']
        }
      }
    ]
  },
  resolve: {
    root: [path.join(__dirname, 'test')],
    extensions: ['', '.js']
  },
  devtool: 'inline-source-map'
};
