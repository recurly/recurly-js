var sys = require('sys');
var Recurly = require('./lib/recurly');
var callback = function(result){
  console.log(sys.inspect(result));
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

recurly.subscriptionPlans.listAll(callback);