Node-Recurly
===============

node-recurly is a node.js library for using the recurly recurring billing service. This library is intended to follow very closely the recurly documentation found at:
http://docs.recurly.com/

Installation
===============

	npm install node-recurly

add a config file to your project that has contents similar to:

		module.exports = {
			API_USERNAME: 'secret',
			API_PASSWORD: 'secret',
			PRIVATE_KEY:  'secret',
			SUBDOMAIN:    '[your_account]',
			ENVIRONMENT:  'sandbox',
			DEBUG: false
		};


Usage
===============

		var Recurly = require('node-recurly');
		var recurly = new Recurly(require('./config'));

After that, just call the methods below:


Accounts
===============
http://docs.recurly.com/api/accounts

	recurly.accounts.create(details, callback)

	recurly.accounts.update(accountcode, details, callback) 

	recurly.accounts.get(accountcode, callback) 

	recurly.accounts.close(accountcode, callback) 

  recurly.accounts.reopen(accountcode, callback)

  recurly.accounts.list(callback, filter)

Billing Information
===============
http://docs.recurly.com/api/billing-info

	recurly.billingInfo.update(accountcode, details, callback) 


	recurly.billingInfo.get(accountcode, callback) 


	recurly.billingInfo.remove(accountcode, callback) 



Adjustments
===============
http://docs.recurly.com/api/adjustments

	recurly.adjustments.get(accountcode, callback)
  
	recurly.adjustments.create(accountcode, details, callback)

	recurly.adjustments.remove(uuid, callback)


Coupons
===============
http://docs.recurly.com/api/coupons

	recurly.coupons.list(callback, filter)
	
	recurly.coupons.get(couponcode, callback)

	recurly.coupons.create(details, callback)

	recurly.coupons.deactivate(couponcode, callback)

Coupon Redemtion
=================
http://docs.recurly.com/api/coupons/coupon-redemption
  
	recurly.couponRedemption.redeem(couponcode, details, callback)

	recurly.couponRedemption.get(accountcode, callback)

	recurly.couponRedemption.remove(accountcode, callback)

	recurly.couponRedemption.getByInvoice(invoicenumber, callback)



Invoices
===============
http://docs.recurly.com/api/invoices

	recurly.invoices.list(callback, filter)
	
	recurly.invoices.listByAccount(accountcode, callback, filter)

	recurly.invoices.get(invoicenumber, callback)
  
	recurly.invoices.create(accountcode, details, callback)

	recurly.invoices.markSuccessful(invoicenumber, callback)

	recurly.invoices.markFailed(invoicenumber, callback)


Subscriptions
===============
http://docs.recurly.com/api/subscriptions

	recurly.subscriptions.list(callback, filter) 
	
	recurly.subscriptions.listByAccount(accountcode, callback) 

	recurly.subscriptions.get(uuid, callback) 

	recurly.subscriptions.create(details, callback) 
  
	recurly.subscriptions.update(uuid, details, callback) 
  
	recurly.subscriptions.cancel(uuid, callback) 
  
	recurly.subscriptions.reactivate(uuid, callback) 
  
	recurly.subscriptions.terminate(uuid, refundType, callback) 

 	recurly.subscriptions.postpone(uuid, nextRenewalDate, callback) 


Subscription Plans
==================
http://docs.recurly.com/api/plans

	recurly.plans.list(callback, filter) 

	recurly.plans.get(plancode, callback) 
	
	recurly.plans.create(details, callback)
  
	recurly.plans.update(plancode, details, callback)
  
	recurly.plans.remove(plancode, callback)

Plan Add-ons
==================
http://docs.recurly.com/api/plans/add-ons

	recurly.planAddons.list(plancode, callback, filter) 

	recurly.planAddons.get(plancode, addoncode, callback) 
  
	recurly.planAddons.create(plancode, details, callback)
  
	recurly.planAddons.update(plancode, addoncode, details, callback)
  
	recurly.planAddons.remove(plancode, addoncode, callback)


Transactions
===============
http://docs.recurly.com/api/transactions

	recurly.transactions.list(callback, filter) 


	recurly.transactions.listByAccount(accountcode, callback, filter) 


	recurly.transactions.get(id, callback) 


	recurly.transactions.create(details, callback) 


	recurly.transactions.refund(id, callback, amount) 
