const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const ejs = require('koa-ejs');
const fs = require('fs');
const jsonp = require('koa-jsonp');
const Koa = require('koa');
const koaQs = require('koa-qs');
const logger = require('koa-logger');
const methodOverride = require('koa-override');
const path = require('path');
const proxy = require('koa-better-http-proxy');
const route = require('koa-route');
const send = require('koa-send');

const {
  API,
  RECURLY_JS_URL,
  PORT
} = process.env;

const app = module.exports = new Koa();
const port = PORT || 9877;
const proxyUrl = new URL(API || 'https://api.recurly.com/js/v1');

// app.use(logger());

// API proxy
app.use(route.all('/api-proxy/*', proxy(proxyUrl.origin, {
  proxyReqPathResolver: ctx => {
    return `${proxyUrl.pathname}/${ctx.request.url.replace(/^\/api-proxy\//, '')}`;
  }
})));
app.use(route.get('/hosted-field/*', proxy(`${proxyUrl.origin.replace('api.', 'js.')}/`)));

// Request parsing
koaQs(app);
app.use(bodyParser());
app.use(methodOverride());
app.use(jsonp());
app.use(cors());

ejs(app, { root: __dirname, layout: false, viewExt: 'html.ejs', cache: false });

// Utility endpoints
app.use(route.get('/build/:artifact', build));
app.use(route.get('/e2e*', e2e));
app.use(route.get('/frame_mock', postMessage));
app.use(route.get('/relay', html('relay')));
app.use(route.get('/mock-404', ctx => ctx.status = 404));
app.use(route.get('/mock-200', ok));

// Standard API fixtures
app.use(route.get('/apple_pay/info', json));
app.use(route.get('/apple_pay/start', json));
app.use(route.get('/apple_pay/token', json));
app.use(route.post('/apple_pay/start', json));
app.use(route.post('/apple_pay/token', json));
app.use(route.get('/bank', json));
app.use(route.get('/coupons/:id', json));
app.use(route.get('/events', ok));
app.use(route.post('/events', ok));
app.use(route.get('/field.html', html('field')));
app.use(route.get('/fraud_data_collector', json));
app.use(route.get('/gift_cards/:id', json));
app.use(route.get('/items/:id', json));
app.use(route.get('/paypal/start', postMessage));
app.use(route.get('/plans/:plan_id', json));
app.use(route.get('/plans/:plan_id/coupons/:id', json));
app.use(route.get('/risk/info', json));
app.use(route.get('/risk/preflights', json));
app.use(route.post('/risk/authentications', json));
app.use(route.get('/tax', json));
app.use(route.get('/three_d_secure/start', postMessage));
app.use(route.get('/three_d_secure/mock', postMessage));
app.use(route.get('/token', json));
app.use(route.post('/token', json));
app.use(route.get('/tokens/:token_id', json));
app.use(route.get('/tokens', json));
app.use(route.post('/tokens', json));

app.listen(port, () => {
  log(`Ready on ${port}`);
});

/**
 * Response functions
 */
async function build (ctx, artifact) {
  if (RECURLY_JS_URL) {
    return await proxy(RECURLY_JS_URL, {
      proxyReqPathResolver: ctx => {
        return RECURLY_JS_URL.replace(/\/[^\/]*$/, `/${artifact}`);
      }
    })(ctx);
  }
  setHeaders(ctx);
  await send(ctx, artifact, { root: path.join(__dirname, '../../build') });
}

async function e2e (ctx) {
  const path = ctx.path.match(/e2e\/?$/) ? 'e2e/index' : ctx.path;
  setHeaders(ctx);
  await ctx.render(`views/${path}`);
}

function html (view) {
  return async ctx => {
    setHeaders(ctx);
    await ctx.render(`fixtures/${view}`);
  };
}

async function json (ctx) {
  setHeaders(ctx);
  ctx.body = fixture(ctx);
}

async function ok (ctx) {
  setHeaders(ctx);
  ctx.body = '';
}

async function postMessage (ctx) {
  setHeaders(ctx);
  await ctx.render('fixtures/post-message', {
    message: {
      recurly_event: ctx.query.event,
      recurly_message: fixture(ctx)
    }
  });
}

/**
 * Utility functions
 */

function fixture (ctx) {
  const f = require(`./fixtures${ctx.request.path}`);
  if (typeof f === 'function') return f.apply(ctx);
  return f;
}

function setHeaders (ctx) {
  ctx.set('Connection', 'keep-alive');
}

function log (...messages) {
  console.log('Test server -- ', ...messages);
}
