(function(){
  var js2xmlparser = require('js2xmlparser'),
      Client = require('./client'),
      utils = require('./utils'),
      router = require('./routes/');

  module.exports = function(config){
		var routes = router.routes(config.API_VERSION ? config.API_VERSION : '2');
		var t = Client.create(config);

		//http://docs.recurly.com/api/accounts
    this.accounts = {
      list: function(callback, filter){
        t.request(utils.addQueryParams(routes.accounts.list, filter), callback);
      },
      get: function(accountcode, callback){
        t.request(utils.addParams(routes.accounts.get, {account_code: accountcode}), callback);
      },
      create: function(details, callback){
        t.request(routes.accounts.create, callback,  js2xmlparser('account',details));
      },
      update: function(accountcode, details, callback){
        t.request(utils.addParams(routes.accounts.update, {account_code: accountcode}), callback, js2xmlparser('account', details));
      },
      close: function(accountcode, callback){
        t.request(utils.addParams(routes.accounts.close, {account_code: accountcode}), callback);
      },
      reopen: function(accountcode, callback){
        t.request(utils.addParams(routes.accounts.reopen, {account_code: accountcode}), callback)
      }
    }

    this.adjustments = {
      get: function(accountcode, callback){
        t.request(utils.addParams(routes.adjustments.get, {account_code: accountcode}), callback);
      },
      create: function(accountcode, details, callback){
        t.request(utils.addParams(routes.adjustments.create, {account_code: accountcode}), callback, js2xmlparser('adjustment',details));
      },
      remove: function(uuid, callback){
        t.request(utils.addParams(routes.adjustments.remove, {uuid: uuid}), callback);
      }
    }
    
		//http://docs.recurly.com/api/billing-info
    this.billingInfo = {
      update: function(accountcode, details, callback){
        t.request(utils.addParams(routes.billingInfo.update, {account_code: accountcode} ), callback, js2xmlparser('billing_info', details));
      },
      get: function(accountcode, callback){
        t.request(utils.addParams(routes.billingInfo.get, {account_code: accountcode} ), callback);
      },
      remove: function(accountcode, callback){
        t.request(utils.addParams(routes.billingInfo.remove, {account_code: accountcode} ), callback);
      }
    }

    //http://docs.recurly.com/api/coupons
    this.coupons = {
      list: function(callback, filter){
        t.request(utils.addQueryParams(routes.coupons.list, filter), callback);
      },
      get: function(couponcode, callback){
        t.request(utils.addParams(routes.coupons.get, {coupon_code: couponcode}), callback);
      },
      create: function(details, callback){
        t.request(routes.coupons.create, callback, js2xmlparser('coupon', details));
      },
      deactivate: function(couponcode, callback){
        t.request(utils.addParams(routes.coupons.deactivate, {coupon_code: couponcode}), callback);
      }
    }

    this.couponRedemption = {
      redeem: function(couponcode, details, callback){
        t.request(utils.addParams(routes.couponRedemption.redeem, {coupon_code: couponcode}), callback, js2xmlparser('redemption', details));
      },
      get: function(accountcode, callback){
        t.request(utils.addParams(routes.couponRedemption.get, {account_code: accountcode}), callback);
      },
      remove: function(accountcode, callback){
        t.request(utils.addParams(routes.couponRedemption.remove, {account_code: accountcode}), callback);
      },
      getByInvoice: function(invoicenumber, callback){
        t.request(utils.addParams(routes.couponRedemption.getByInvoice, {invoice_number: invoicenumber}), callback)
      }
    }

    this.invoices = {
      list: function(callback, filter){
        t.request(utils.addQueryParams(routes.invoices.list, filter), callback);
      },
      listByAccount: function(accountcode, callback, filter){
        t.request(
          utils.addParams(
            utils.addQueryParams(routes.invoices.listByAccount, filter)
            , {account_code: accountcode})
          , callback)
      },
      get: function(invoicenumber, callback){
        t.request(utils.addParams(routes.invoices.get, {invoice_number: invoicenumber}), callback);
      },
      create: function(accountcode, details, callback){
        t.request(utils.addParams(routes.invoices.create, {account_code: accountcode}), callback, js2xmlparser('invoice', details));
      },
      markSuccessful: function(invoicenumber, callback){
        t.request(utils.addParams(routes.invoices.markSuccessful, {invoice_number: invoicenumber}), callback);
      },
      markFailed: function(invoicenumber, callback){
        t.request(utils.addParams(routes.invoices.markFailed, {invoice_number: invoicenumber}), callback);
      }
    }

    this.plans = {
      list: function(callback, filter){
        t.request(utils.addQueryParams(routes.plans.list, filter), callback);
      },
      get: function(plancode, callback){
        t.request(utils.addParams(routes.plans.get, {plan_code: plancode}), callback);
      },
      create: function(details, callback){
        t.request(routes.plans.create, callback, js2xmlparser('plan', details));
      },
      update: function(plancode, details, callback){
        t.request(utils.addParams(routes.plans.update, {plan_code: plancode}), callback, js2xmlparser('plan', details));
      },
      remove: function(plancode, callback){
        t.request(utils.addParams(routes.plans.remove, {plan_code: plancode}), callback);
      }
    }

    this.planAddons = {
      list: function(plancode, callback, filter){
        t.request(utils.addParams(utils.addQueryParams(routes.planAddons.list, filter), {plan_code: plancode}), callback);
      },
      get: function(plancode, addoncode, callback){
        t.request(utils.addParams(routes.planAddons.get, {plan_code: plancode, addon_code: addoncode}), callback);
      },
      create: function(plancode, details, callback){
        t.request(utils.addParams(routes.planAddons.create, {plan_code: plancode}), callback, js2xmlparser('add_on', details));
      },
      update: function(plancode, addoncode, details, callback){
        t.request(utils.addParams(
          routes.planAddons.update, 
          { plan_code: plancode,
            add_on_code: addoncode
          }), 
        callback, js2xmlparser('add_on', details));
      },
      remove: function(plancode, addoncode, callback){
        t.request(utils.addParams(routes.planAddons.remove, {plan_code: plancode, add_on_code: addoncode}), callback);
      }
    }

    this.subscriptions = {
      list: function(callback, filter){
        t.request(utils.addQueryParams(routes.subscriptions.list, filter), callback);
      },
      listByAccount: function(accountcode, callback){
        t.request(utils.addParams(routes.subscriptions.listByAccount, {account_code: accountcode}), callback);

      },
      get: function(uuid, callback){
        t.request(utils.addParams(routes.subscriptions.get, {uuid: uuid}), callback);
      },
      create: function(details, callback){
        t.request(routes.subscriptions.create, callback, js2xmlparser('subscription', details));
      },
      update: function(uuid, details, callback){
        t.request(utils.addParams(routes.subscriptions.update, {uuid: uuid}), callback, js2xmlparser('subscription', details));
      },
      cancel: function(uuid, callback){
        t.request(utils.addParams(routes.subscriptions.cancel, {uuid: uuid}), callback);
      },
      reactivate: function(uuid, callback){
        t.request(utils.addParams(routes.subscriptions.reactivate, {uuid: uuid}), callback);
      },
      terminate: function(uuid, refundType, callback){
        t.request(utils.addParams(routes.subscriptions.terminate, {uuid: uuid, refund_type: refundType}), callback);
      },
      postpone: function(uuid, nextRenewalDate, callback){
        t.request(utils.addParams(routes.subscriptions.postpone, {uuid: uuid, next_renewal_date: nextRenewalDate}), callback);
      }
    }

    this.transactions = {
      list: function(callback, filter){
        t.request(utils.addQueryParams(routes.transactions.list, filter), callback);
      },
      listByAccount: function(accountCode, callback, filter){
        t.request(
          utils.addParams(
            utils.addQueryParams(routes.transactions.listByAccount, filter), {account_code: accountCode}),
          callback);
      },
      get: function(id, callback){
        t.request(utils.addParams(routes.transactions.get, {'id': id}), callback);
      },
      create: function(details, callback){
        t.request(routes.transactions.create, callback, js2xmlparser('transaction', details));
      },
      refund: function(id, callback, amount){
        var route = utils.addParams(routes.transactions.refund, {id: id});
        if(amount){
          route = utils.addQueryParams(route, { amount_in_cents: amount });
        }
        t.request(route, callback)
      }
    }
  }//end class
})();
