const fs = require('fs');
const path = require('path');
const Koa = require('koa');
const ejs = require('koa-ejs');
const cors = require('@koa/cors');
const jsonp = require('koa-jsonp');
const route = require('koa-route');
const logger = require('koa-logger');
const bodyParser = require('koa-bodyparser');
const koaQs = require('koa-qs');

const app = new Koa();
const port = process.env.PORT || 9877;

koaQs(app);
app.use(bodyParser());
app.use(jsonp());
app.use(cors());

ejs(app, { root: __dirname, layout: false, viewExt: 'html.ejs' });

app.use(route.get('/bank', json));
app.use(route.get('/coupons/:id', json));
app.use(route.get('/events', ok));
app.use(route.post('/events', ok));
app.use(route.get('/fraud_data_collector', json));
app.use(route.get('/risk/info', json));
app.use(route.get('/gift_cards/:id', json));
app.use(route.get('/items/:id', json));
app.use(route.get('/plans/:plan_id', json));
app.use(route.get('/plans/:plan_id/coupons/:id', json));
app.use(route.get('/risk/info', json));
app.use(route.get('/risk/preflights', json));
app.use(route.get('/tax', json));
app.use(route.get('/token', json));
app.use(route.post('/token', json));
app.use(route.get('/tokens/:token_id', json));
app.use(route.post('/tokens', json));

app.use(route.get('/apple_pay/info', json));
app.use(route.get('/apple_pay/start', json));
app.use(route.get('/apple_pay/token', json));
app.use(route.post('/apple_pay/start', json));
app.use(route.post('/apple_pay/token', json));
app.use(route.get('/paypal/start', postMessage));
app.use(route.get('/three_d_secure/start', postMessage));
app.use(route.get('/three_d_secure/mock', postMessage));

app.use(route.get('/frame_mock', postMessage));
app.use(route.get('/relay', html('relay')));
app.use(route.get('/field.html', html('field')));

app.use(route.get('/mock-404'), ctx => ctx.status = 404);
app.use(route.get('/mock-200'), ok);

app.listen(port, () => {
  fs.writeFileSync(`${__dirname}/pid.txt`, process.pid, 'utf-8');
  console.log(`ready on ${port}`);
});

/**
 * Response functions
 */

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
  if (typeof f === 'function') return f.apply(ctx)
  return f;
}

function setHeaders (ctx) {
  ctx.set('Connection', 'keep-alive');
}
