
/*!
 * Module dependencies.
 */

var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
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

// This corrects an incorrect Content-type header
// sent by IE9 XDomainRequests
app.use(function (req, res, next) {
  if (req.method === 'POST') {
    req.headers['content-type'] = 'application/x-www-form-urlencoded';
  }
  next();
});

app.use(express.bodyParser());
app.use(express.static(path.resolve(__dirname + '/../..')));

// CORS headers
app.use(function (req, res, next) {
  res.set({
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Accept, Accept-Encoding, Accept-Language, Content-Type, Origin, User-Agent, X-Requested-With',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  next();
});

/**
 * Fixtures.
 */

app.get('/plans/:plan_code', json);
app.get('/plans/:plan_code/coupons/:coupon_code', json);
app.get('/token', json);
app.post('/token', json);
app.get('/tax', json);
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

function json (req, res) {
  if (req.query.callback) {
    res.jsonp(fixture(req, res));
  } else {
    res.json(fixture(req, res));
  }
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
