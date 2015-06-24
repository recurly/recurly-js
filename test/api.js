var bodyParser = require('koa-bodyparser');
var route = require('koa-route');
var path = require('path');
var ejs = require('ejs');

module.exports = api;

/**
 * Recurly.js API mock
 * @param {Object} app Koa app
 */
function api (app) {
  app.use(cors);
  app.use(contentTypeFix);
  app.use(bodyParser());
  app.use(route.get('/plans/:plan_code', json));
  app.use(route.get('/plans/:plan_code/coupons/:coupon_code', json));
  app.use(route.post('/token', json));
  app.use(route.get('/token', json));
  app.use(route.get('/tax', json));
  app.use(route.get('/paypal/start', postMessage));
  app.use(route.get('/relay', relay));
}

/**
 * Utility functions.
 */

function* json () {
  var data = fixture.apply(this);
  if (this.query.callback) {
    this.body = [this.query.callback, '(', JSON.stringify(data), ')'].join('');
  } else {
    this.body = data;
  }
}

function* postMessage () {
  this.body = ejs.render('post-message', {
    message: {
      recurly_event: this.query.event,
      recurly_message: fixture.apply(this)
    }
  });
}

function* relay () {
  this.body = ejs.render(fixture.apply({ path: 'relay.ejs' }));
}

function fixture () {
  var fixture = require(path.join(__dirname, 'fixtures', this.path));
  return typeof fixture === 'function'
    ? fixture.apply(this)
    : fixture;
}

function* cors (next) {
  this.set('Access-Control-Allow-Origin', '*');
  yield next;
}

// Corrects an incorrect Content-type header sent by IE9 XDomainRequests
function* contentTypeFix (next) {
  if (this.method === 'POST') {
    this.req.headers['content-type'] = 'application/x-www-form-urlencoded';
  }
  yield next;
}
