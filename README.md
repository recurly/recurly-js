IMPORTANTE: This version is working with the version 2 of Recurly's API. Documentation will be updated soon.

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


	recurly.accounts.listAll(callback, filter)

Billing Information
===============
http://docs.recurly.com/transparent-post/billing-info

	recurly.billingInfo.update(accountcode, details, callback) 


	recurly.billingInfo.get(accountcode, callback) 


	recurly.billingInfo.delete(accountcode, callback) 


Charges
===============
http://docs.recurly.com/api/charges

	recurly.charges.listAll(accountcode, callback, filter) 


	recurly.charges.chargeAccount(accountcode, details, callback) 


Coupons
===============
http://docs.recurly.com/api/coupons

	recurly.coupons.getAssociatedWithAccount(accountcode, callback) 



NOTE: Redeem coupon with subscription not added here since it is a duplication of the subscription creation method

	recurly.coupons.redeemOnAccount(accountcode, details, callback) 


	recurly.coupons.removeFromAccount(accountcode, callback) 

  
Charges
===============
http://docs.recurly.com/api/credits

	recurly.credits.listAll(accountcode, callback) 


	recurly.credits.creditAccount(accountcode, details, callback) 


Invoices
===============
http://docs.recurly.com/api/invoices

	recurly.invoices.getAssociatedWithAccount(accountcode, callback) 


	recurly.invoices.get(invoiceid, callback) 


	recurly.invoices.invoiceAccount(accountcode, callback) 



Subscriptions
===============
http://docs.recurly.com/api/subscriptions

	recurly.subscriptions.getAssociatedWithAccount(accountcode, callback) 



**NOTE Certain uses of this method will have implications on PCI compliance because this
function requires access to and transmission of customer credit card information.

	recurly.subscriptions.create(accountcode, details, callback) 



refundtype can be 'partial', 'full' or 'none'

	recurly.subscriptionsrefund(accountcode, callback, refundtype) 



Subscription Plans
===============
http://docs.recurly.com/api/subscription-plans

	recurly.subscriptionPlans.listAll(callback) 


	recurly.subscriptionPlans.get(plancode, callback) 



Create, Update, and Delete are not implemented because the reculy documentation indicates them as advanced cases


Transactions
===============
http://docs.recurly.com/api/transactions

	recurly.transactions.listAll(accountcode, callback, filter) 


	recurly.transactions.getAssociatedWithAccount(accountcode, callback) 


	recurly.transactions.get(transactionid, callback) 


	recurly.transactions.void(transactionid, callback) 


	recurly.transactions.refund(transactionid, callback, amount) 

NOTE Certain uses of this method will have implications on PCI compliance because this
function requires access to and transmission of customer credit card information.

	recurly.transactions.createImmediateOneTimeTransaction(accountcode, details, callback)

Transparent Post
==================
http://docs.recurly.com/transparent-post/basics

	recurly.transparent.billingInfoUrl

	recurly.transparent.subscribeUrl

	recurly.transparent.transactionUrl

	recurly.transparent.hidden_field(data)

	recurly.transparent.getResults(confirm, result, status, type, callback){

	recurly.transparent..getFormValuesFromResult(result, type)