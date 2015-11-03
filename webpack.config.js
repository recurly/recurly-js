var path = require('path');

module.exports = {
  entry: './index',
  output: {
    path: path.join(__dirname, 'build'),
    publicPath: '/build/',
    filename: 'recurly.js'
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel'
      }
    ]
  },
  resolce: {
    root: [__dirname],
    extensions: ['', '.js']
  }
};
