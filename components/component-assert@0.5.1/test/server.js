
/**
 * Module dependencies.
 */

var express = require('express');
var hbs = require('hbs');

/**
 * App.
 */

express()
  .use(express.static(__dirname + '/..'))
  .set('views', __dirname)
  .engine('html', hbs.__express)
  .get('*', function (req, res) { res.render('index.html'); })
  .listen(7575, function(){
    console.log();
    console.log('  Tests running at http://localhost:7575/ ...');
    console.log();
  });