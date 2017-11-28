const fs = require('fs');
const path = require('path');
const koa = require('koa');
const ejs = require('koa-ejs');
const cors = require('koa-cors');
const jsonp = require('koa-jsonp');
const route = require('koa-route');
const logger = require('koa-logger');
const bodyParser = require('koa-body-parser');
const koaQs = require('koa-qs');

const app = koa();
const port = process.env.PORT || 9877;

koaQs(app);
app.use(bodyParser());
app.use(jsonp());
app.use(cors({
  credentials: true,
  headers: [
    'Accept', 'Accept-Encoding', 'Accept-Language',
    'Content-Type', 'Origin', 'User-Agent',
    'X-Requested-With'
  ],
  methods: ['GET', 'POST', 'OPTIONS']
}));

ejs(app, { root: __dirname, layout: false, viewExt: 'html.ejs' });

app.use(route.get('/coupons/:id', json));
app.use(route.get('/fraud_data_collector', json));
app.use(route.get('/gift_cards/:id', json));
app.use(route.get('/plans/:plan_id', json));
app.use(route.get('/plans/:plan_id/coupons/:id', json));
app.use(route.get('/tax', json));

app.use(route.get('/token', json));
app.use(route.post('/token', json));

app.use(route.get('/paypal/start', postMessage));
app.use(route.get('/apple_pay/info', json));
app.use(route.get('/apple_pay/start', json));
app.use(route.get('/apple_pay/token', json));
app.use(route.post('/apple_pay/start', json));
app.use(route.post('/apple_pay/token', json));

app.use(route.get('/relay', render('relay')));
app.use(route.get('/field', render('field')));
app.use(route.get('/field.html', render('field')));

app.listen(port, () => {
  fs.writeFileSync(`${__dirname}/pid.txt`, process.pid, 'utf-8');
  console.log(`ready on ${port}`);
});

function render (view) {
  return function *() {
    yield this.render(`fixtures/${view}`);
  };
}

function *json () {
  this.body = fixture.apply(this);
}

function *postMessage () {
  yield this.render('fixtures/post-message', {
    message: {
      recurly_event: this.query.event,
      recurly_message: fixture.apply(this)
    }
  });
}

function fixture () {
  const f = require(`./fixtures${this.request.path}`);
  if (typeof f === 'function') return f.apply(this)
  return f;
}
