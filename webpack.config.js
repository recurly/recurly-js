var path = require('path');
var minify = ~process.argv.indexOf('-p');

module.exports = {
  entry: './index',
  output: {
    path: path.join(__dirname, 'build'),
    publicPath: '/build/',
    filename: 'recurly' + (minify ? '.min.js' : '.js'),
    libraryTarget: 'var',
    library: 'recurly'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          cacheDirectory: true,
          presets: ['es2015'],
          plugins: ['transform-object-assign']
        }
      }
    ]
  },
  resolve: {
    root: [__dirname],
    extensions: ['', '.js']
  }
};
