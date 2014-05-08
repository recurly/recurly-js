
/*!
 * Module dependencies.
 */

var fs = require('fs');
var path = require('path');
var express = require('express');
var app = module.exports = express();

/**
 * Settings.
 */

app.set('views', __dirname);
app.set('view engine', 'jade');
app.set('view options', { debug: true })
app.set('port', process.env.PORT || 8989);
app.set('jsonp callback name', 'callback');

/**
 * Locals.
 */

app.locals.pretty = true;

/**
 * Middleware.
 */

app.use(express.logger());
app.use(express.static(path.resolve(__dirname + '/../..')));

/**
 * Fixtures.
 */

app.get('/plans/:plan_code', jsonp);
app.get('/plans/:plan_code/coupons/:coupon_code', jsonp);
app.get('/token', jsonp);
app.get('/tax', jsonp);
app.get('/3d_secure/start', postMessage);
app.get('/paypal/start', postMessage);
app.get('/relay', render('relay'));
app.get('*', render('index'));

/**
 * Listen.
 */

app.listen(app.get('port'), function () {
  fs.writeFileSync(__dirname + '/pid.txt', process.pid, 'utf-8');
});

/**
 * Utility functions.
 */

function render (view) {
  return function (req, res) {
    res.render(view);
  };
}

function jsonp (req, res) {
  res.jsonp(fixture(req, res));
}

function postMessage (req, res) {
  res.render('post-message', {
      message: {
        recurly_event: req.query.event
      , recurly_message: fixture(req, res)
    }
  });
}

function fixture (req, res) {
  var fixture = require('./fixtures' + req.path);
  return 'function' === typeof fixture
    ? fixture(req, res)
    : fixture;
}

