var util = require('util');
var Recurly = require('./lib/recurly');
var callback = function(result){
  console.log(util.inspect(result));
};

recurly = new Recurly(require('./config'));
// recurly.charges.chargeAccount('robrighter@gmail.com',{
//   amount_in_cents: '850',
//   description: 'testing the charge'
// },callback);

//recurly.charges.listAll('robrighter@gmail.com',callback);

// recurly.coupons.redeemOnAccount('robrighter@gmail.com', {
//    coupon_code: '50PERCENTOFF'
// },callback);

//recurly.coupons.removeFromAccount('robrighter@gmail.com',callback);

//recurly.coupons.getAssociatedWithAccount('robrighter@gmail.com',callback);

// recurly.credits.creditAccount('robrighter@gmail.com',{
//   amount_in_cents: 550,
//   description: 'Cutting you a break 3'
// }, callback);

//recurly.credits.listAll('robrighter@gmail.com',callback);

//recurly.invoices.getAssociatedWithAccount('robrighter@gmail.com',callback);
//recurly.invoices.get('7aba9e26feae42c1acb078fea1024c6f',callback);
//recurly.invoices.invoiceAccount('robrighter@gmail.com',callback);

//recurly.subscriptions.getAssociatedWithAccount('robrighter@gmail.com',callback);

//recurly.subscriptionPlans.listAll(callback);
//recurly.subscriptions.refund('robrighter@gmail.com',callback,'partial');

// recurly.subscriptions.create('robrighter@gmail.com',{
//   plan_code: 'test-plan',
//   quantity: 1,
//   account: {
//     billing_info: {
//       first_name: 'berty',
//       last_name: 'tester',
//       address1: '123 my street',
//       address2: '',
//       city: 'Chattanooga',
//       state: 'TN',
//       zip: '37408',
//       country: 'US'
//     }
//   }
// },callback);

// recurly.transactions.createImmediateOneTimeTransaction('robrighter@gmail.com',{
//   account:{
//     account_code: 'robrighter'
//   },
//   amount_in_cents: 600,
//   description: 'just testing things out'
// },callback)

var data = { 
	'account[account_code]': 'demo-1301435036',
	'account[username]': 'username123',
	'redirect_url': 'http://localhost/subscribe.php',
	'subscription[plan_code]': 'test-plan'
}

console.log(recurly.transparent.subscribeUrl());

console.log(recurly.transparent.hidden_field(data));

recurly.transparent.getResults('dfd82a741b3e5f15e32439fb66f7696046138105',//confirm
 																'31c6f6c96f3045cdbc126934295e889b',//result
																'422',//status
																'subscription',//type
																 callback)