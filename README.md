Node-Recurly
===============
[![npm](https://img.shields.io/npm/dm/recurly-js.svg)](https://www.npmjs.com/package/recurly-js)  

This is a fork of original `node-recurly` library by [Rob Righter](https://github.com/robrighter) for the recurly recurring billing service. 

This library is intended to follow very closely the recurly documentation found at: [Recurly Docs](http://docs.recurly.com/)


Installation
===============

	npm install recurly-js --save

Add a config file to your project that has contents similar to:

		module.exports = {
			API_KEY: 'secret',
			SUBDOMAIN:    '[your_account]',
			ENVIRONMENT:  'sandbox',
			DEBUG: false,
			API_VERSION: 2.7 // optional
		};


Usage
===============

#### Using callbacks

```javascript
var Recurly = require('recurly-js');
var recurly = new Recurly(require('./config'));
recurly.accounts.get('account_code_123', function (errResponse, response) {
})
```

#### Or a promises based version

```javascript
var Recurly = require('recurly-js/promise');
var recurly = new Recurly(require('./config'));
recurly.accounts.get('account_code_123')
  .then(function (response) {})
  .catch(function (errorResponse) {})
```

For convenience the original callback version of every method is available with Callback suffix
```javascript
var callback = function () {};

var filter = {
  state: 'active'
};

recurly.subscriptions
    .listByAccountCallback('account_code_123', callback, filter)
```

Accounts
===============
http://docs.recurly.com/api/accounts


    recurly.accounts.list(callback, filter)
    recurly.accounts.create(details, callback)
    recurly.accounts.update(accountcode, details, callback) 
    recurly.accounts.get(accountcode, callback) 
    recurly.accounts.close(accountcode, callback) 
    recurly.accounts.reopen(accountcode, callback)
    recurly.accounts.notes(accountcode, callback)


Billing Information
===============
http://docs.recurly.com/api/billing-info

    recurly.billingInfo.update(accountcode, details, callback) 
    recurly.billingInfo.get(accountcode, callback) 
    recurly.billingInfo.remove(accountcode, callback) 


Adjustments
===============
http://docs.recurly.com/api/adjustments

    recurly.adjustments.list(accountcode, callback)
    recurly.adjustments.get(uuid, callback)
    recurly.adjustments.create(accountcode, details, callback)
    recurly.adjustments.remove(uuid, callback)
    


Coupons
===============
http://docs.recurly.com/api/coupons

    recurly.coupons.list(callback, filter)
    recurly.coupons.get(couponcode, callback)
    recurly.coupons.create(details, callback)
    recurly.coupons.deactivate(couponcode, callback)
	

Coupon Redemption
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
    recurly.invoices.preview(accountcode, callback)
    recurly.invoices.refundLineItems(invoicenumber, details, callback)
    recurly.invoices.refundOpenAmount(invoicenumber, details, callback)
    recurly.invoices.markSuccessful(invoicenumber, callback)
    recurly.invoices.markFailed(invoicenumber, callback)
    recurly.invoices.enterOfflinePayment(invoicenumber, details, callback)
  
  
  Special pdf method - callback will contain a pdf document as `Buffer`
  You should send the buffer to the client with content type of `application/pdf`
  
    recurly.invoices.retrievePdf(invoicenumber, details, callback)

Subscriptions
===============
http://docs.recurly.com/api/subscriptions

    recurly.subscriptions.list(callback, filter) 
    recurly.subscriptions.listByAccount(accountcode, callback) 
    recurly.subscriptions.get(uuid, callback) 
    recurly.subscriptions.create(details, callback) 
    recurly.subscriptions.preview(details, callback) 
    recurly.subscriptions.update(uuid, details, callback) 
    recurly.subscriptions.updateNotes(uuid, details, callback)
    recurly.subscriptions.updatePreview(uuid, details, callback)
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

Usage Records
=============
https://dev.recurly.com/docs/usage-record-object

	recurly.usageRecords.list(subscription_uuid, add_on_code, callback, filter) 
	recurly.usageRecords.lookup(subscription_uuid, add_on_code, usage_id, callback) 
	recurly.usageRecords.log(subscription_uuid, add_on_code, details, callback) 
	recurly.usageRecords.update(subscription_uuid, add_on_code, usage_id, details, callback) 
	recurly.usageRecords.delete(subscription_uuid, add_on_code, usage_id, callback) 


Custom api calls
================

```javascript
var options = {
  url: '/v2/accounts/' + account_code + '/invoices',
  method: 'POST',
  headers: {
    "My-Custom_header": "Value"
  },
  bodyRoot: 'invoice', // xml root element
  body: {} // content to convert to xml using js2xmlparser
};

recurly.api(options, callback)
```
