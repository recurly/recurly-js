var Recurly = require('../'),
	config = require('./config-example'),
	recurly = new Recurly(config),
	utils = require('../lib/utils');

// recurly.accounts.list(function(res){
// 	console.log(res);
// })

// recurly.accounts.get(11, function(res){
// 	console.log(res);
// })

// recurly.accounts.close(11, function(res){
// 	console.log(res);
// })

// recurly.accounts.reopen(11, function(res){
// 	console.log(res);
// })

// recurly.adjustments.create(11, {currency: 'EUR', unit_amount_in_cents: 100, description: 'Testing'}, function(res){
// 	console.log(res);
// })

// recurly.adjustments.remove('1b874884827e0b9eee7d974446874231', function(res){
// 	console.log(res);
// })

// recurly.billingInfo.get(1, function(res){
// 	console.log(res);
// })

// recurly.billingInfo.update(1, { first_name: 'Ivanovich' }, function(res){
// 	console.log(res);
// })

// recurly.billingInfo.remove(1, function(res){
// 	console.log(res);
// })

// recurly.coupons.list(function(res){
// 	console.log(res);
// })

// recurly.coupons.get('coupon_50', function(res){
// 	console.log(res);
// })

// recurly.coupons.create({coupon_code: 'test', name: 'Test name', discount_type: 'percent', discount_percent: 20}, function(res){
// 	console.log(res);
// })

// recurly.coupons.deactivate('test', function(res){
// 	console.log(res);
// })

// recurly.couponRedemption.redeem('coupon_50', {account_code: 1, 	currency: 'EUR'}, function(res){
// 	console.log(res);
// })

// recurly.couponRedemption.get(1, function(res){
// 	console.log(res);
// })

// recurly.couponRedemption.remove(1, function(res){
// 	console.log(res);
// })

// recurly.couponRedemption.getByInvoice(1070, function(res){
// 	console.log(res);
// })

// recurly.plans.list(function(res){
// 	console.log(res);
// })

// recurly.plans.get('premium', function(res){
// 	console.log(res);
// })

// recurly.plans.create({plan_code: 'testing', name:'Testing', unit_amount_in_cents: {EUR: 6000} }, function(res){
// 	console.log(res);
// })

// recurly.plans.update('testing', {name:'Testing2', unit_amount_in_cents: {EUR: 6000} }, function(res){
// 	console.log(res);
// })

// recurly.plans.remove('testing', function(res){
// 	console.log(res);
// })

// recurly.planAddons.list('premium', function(res){
// 	console.log(res);
// })

// recurly.planAddons.create('premium', { add_on_code: 'test', name: 'Test', unit_amount_in_cents: { EUR: 10 } }, function(res){
// 	console.log(res);
// })

// recurly.planAddons.get('premium', 'test', function(res){
// 	console.log(res);
// })

// recurly.planAddons.update('premium', 'test', {name: 'Testing'}, function(res){
// 	console.log(res);
// })

// recurly.planAddons.remove('premium', 'test', function(res){
// 	console.log(res);
// })

// recurly.subscriptions.list(function(res){
// 	console.log(res);
// })

// recurly.subscriptions.listByAccount(1, function(res){
// 	console.log(res);
// })

// recurly.subscriptions.get('1b71110580e1768adb5a224bbc9dd0b0', function(res){
// 	console.log(res);
// })

// recurly.subscriptions.create(
// 	{plan_code: 'premium', 
// 	account: 1, 
// 	currency: 'EUR',
// 	account: {
// 		account_code: 1, 
// 		billing_info: {
// 			number: '4111-1111-1111-1111',
// 			first_name: 'Ivan',
// 			last_name: 'Guardado'
// 		} 
// 	}
// }, function(res){
// 	console.log(res);
// })

// recurly.subscriptions.reactivate('1b71110580e1768adb5a224bbc9dd0b0', function(res){
// 	console.log(res);
// })

// recurly.subscriptions.cancel('1b71110580e1768adb5a224bbc9dd0b0', function(res){
// 	console.log(res);
// })

// TODO revisar bien esto
// recurly.subscriptions.postpone('1b71110580e1768adb5a224bbc9dd0b0', new Date().getTime()/1000+1000 , function(res){
// 	console.log(res);
// })

// recurly.subscriptions.terminate('1b71110580e1768adb5a224bbc9dd0b0', 'none', function(res){
// 	console.log(res);
// })

// recurly.transactions.list(function(res){
// 	console.log(res);
// })

// recurly.transactions.listByAccount(1, function(res){
// 	console.log(res);
// })

// recurly.transactions.get('1b7111060195de32c642264e468f75f3', function(res){
// 	console.log(res);
// })

// recurly.transactions.create({account: { account_code: 1 } , amount_in_cents: 100, currency: 'EUR'}, function(res){
// 	console.log(res);
// })

// recurly.transactions.refund('1b87e486fbc4cf6309fdad4787844df5', function(res){
// 	console.log(res);
// })
















