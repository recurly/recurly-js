const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const path = require('path');
const minify = ~process.argv.indexOf('-p');
const manifest = require('./package.json');

module.exports = {
  node: {
    global: false,
  },
  entry: './index',
  mode: 'development',
  output: {
    path: path.join(__dirname, 'build'),
    publicPath: '/build/',
    filename: 'recurly' + (minify ? '.min.js' : '.js'),
    library: 'recurly',
    libraryExport: 'default'
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
              plugins: [
                '@babel/plugin-transform-object-assign',
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-proposal-export-default-from'
              ],
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    browsers: manifest.browserslist
                  }
                }]
              ]
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
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
    new MiniCssExtractPlugin({ filename: 'recurly.css' })
  ],
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        uglifyOptions: {
          output: { comments: false }
        }
      }),
      new OptimizeCSSAssetsPlugin({})
    ]
  },
  devServer: {
    disableHostCheck: true,
    host: 'js.lvh.me'
  },
};
