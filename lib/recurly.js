(function(){
  var https = require('https');
  var xml2js = require('xml2js/lib');
	var Transparent = require('./transparent');
	var Tools = require('./tools');
  module.exports = function(config){
    
		var t = new Tools(config);
		var transparent = new Transparent(config);
		
		//add additional info to the config object
		config.RECURLY_HOST = 'api-' + config.ENVIRONMENT + '.recurly.com'
		config.RECURLY_BASE_URL = 'https://' + config.RECURLY_HOST;

    this.accounts = {
      create: function(details, callback){
        t.request('/accounts', 'POST', callback, t.js2xml(details,'account'));
      },
      update: function(accountcode, details, callback){
        t.request('/accounts/'+accountcode, 'PUT', callback, t.js2xml(details,'account'));
      },
      get: function(accountcode, callback){
        t.request('/accounts/'+accountcode, 'GET', callback);
      },
      close: function(accountcode, callback){
        t.request('/accounts/'+accountcode, 'DELETE', callback);
      },
      listAll: function(callback, filter){
        t.request('/accounts' + ((filter)? '?show='+filter : '' ), 'GET', callback);
      }
    }
    
    this.billingInfo = {
      update: function(accountcode, details, callback){
        t.request('/accounts/'+accountcode+'/billing_info', 'PUT', callback, t.js2xml(details,'billing_info'));
      },
      get: function(accountcode, callback){
        t.request('/accounts/'+accountcode+'/billing_info', 'GET', callback);
      },
      delete: function(accountcode, callback){
        t.request('/accounts/'+accountcode+'/billing_info', 'DELETE', callback);
      }
    }
    
    //http://docs.recurly.com/api/charges
    this.charges = {
      listAll: function(accountcode, callback, filter){
        t.request('/accounts/' + accountcode +'/charges'+ ((filter)? '?show='+filter : '' ), 'GET', callback);
      },
      chargeAccount: function(accountcode, details, callback){
        t.request('/accounts/' + accountcode + '/charges', 'POST', callback, t.js2xml(details,'charge'));
      }
    }
    
    //http://docs.recurly.com/api/coupons
    this.coupons = {
      getAssociatedWithAccount: function(accountcode, callback){
        t.request('/accounts/' + accountcode +'/coupon' , 'GET', callback);
      },
      //NOTE: Redeem coupon with subscription not added here since it is a duplication of the subscription creation method
      redeemOnAccount: function(accountcode, details, callback){
        t.request('/accounts/' + accountcode + '/coupon', 'POST', callback, t.js2xml(details,'coupon'));
      },
      removeFromAccount: function(accountcode, callback){
        t.request('/accounts/'+accountcode+'/coupon', 'DELETE', callback);
      }
      
    }
    
    //http://docs.recurly.com/api/credits
    this.credits = {
      listAll: function(accountcode, callback){
        t.request('/accounts/' + accountcode +'/credits', 'GET', callback);
      },
      creditAccount: function(accountcode, details, callback){
        t.request('/accounts/' + accountcode + '/credits', 'POST', callback, t.js2xml(details,'credit'));
      }
    }
    
    //http://docs.recurly.com/api/invoices
    this.invoices = {
      getAssociatedWithAccount: function(accountcode, callback){
        t.request('/accounts/' + accountcode +'/invoices', 'GET', callback);
      },
      get: function(invoiceid, callback){
        t.request('/invoices/' + invoiceid, 'GET', callback);
      },
      invoiceAccount: function(accountcode, callback){
        t.request('/accounts/' + accountcode + '/invoices', 'POST', callback);
      }
    }
    
    //http://docs.recurly.com/api/subscriptions
    this.subscriptions = {
      getAssociatedWithAccount: function(accountcode, callback){
        t.request('/accounts/' + accountcode +'/subscription', 'GET', callback);
      },
      //**NOTE Certain uses of this method will have implications on PCI compliance because this
      ///      function requires access to and transmission of customer credit card information.
      create: function(accountcode, details, callback){
        t.request('/accounts/' + accountcode + '/subscription', 'POST', callback, t.js2xml(details,'subscription'));
      },
      // refundtype can be 'partial', 'full' or 'none'
      refund: function(accountcode, callback, refundtype){
        t.request('/accounts/' + accountcode +'/subscription'+ ((refundtype)? '?refund='+refundtype : '' ), 'DELETE', callback);
      }
    }
    
    //http://docs.recurly.com/api/subscription-plans
    this.subscriptionPlans = {
      listAll: function(callback){
        t.request('/company/plans', 'GET', callback);
      },
      get: function(plancode, callback){
        t.request('/company/plans/' + plancode, 'GET', callback);
      }
      //Create, Update, and Delete are not implemented because the reculy documentation indicates them as advanced cases
    }
    
    //http://docs.recurly.com/api/transactions
    this.transactions = {
      listAll: function(accountcode, callback, filter){
        t.request('/transactions'+ ((filter)? '?show='+filter : '' ), 'GET', callback);
      },
      getAssociatedWithAccount: function(accountcode, callback){
        t.request('/accounts/' + accountcode +'/transactions', 'GET', callback);
      },
      get: function(transactionid, callback){
        t.request('/transactions/' + transactionid, 'GET', callback);
      },
      void: function(transactionid, callback){
        t.request('/transactions/' + transactionid+ '?action=void', 'DELETE', callback);
      },
      refund: function(transactionid, callback, amount){
        t.request('/transactions/' + transactionid+ '?action=refund&amount='+amount, 'DELETE', callback);
      },
      //**NOTE Certain uses of this method will have implications on PCI compliance because this
      ///      function requires access to and transmission of customer credit card information.
      createImmediateOneTimeTransaction: function(accountcode, details, callback){
        t.request('/transactions', 'POST', callback, t.js2xml(details,'transaction'));
      } 
    }

		//https://github.com/recurly/recurly-client-ruby/blob/master/lib/recurly/transparent.rb
    this.transparent = transparent;
		
 
  }//end class
})();