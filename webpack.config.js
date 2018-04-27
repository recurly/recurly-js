var ExtractTextPlugin = require("extract-text-webpack-plugin");
var path = require('path');
var minify = ~process.argv.indexOf('-p');

module.exports = {
  node: {
    global: false,
  },
  entry: './index',
  output: {
    path: path.join(__dirname, 'build'),
    publicPath: '/build/',
    filename: 'recurly' + (minify ? '.min.js' : '.js'),
    libraryTarget: 'var',
    library: 'recurly'
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
              plugins: ['transform-object-assign']
            }
          }
        ]
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
    extensions: ['.js'],
    modules: [
      path.join(__dirname),
      'node_modules'
    ]
  },
  plugins: [
    new ExtractTextPlugin('recurly.css')
  ]
};
