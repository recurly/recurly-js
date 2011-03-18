(function(){
  var https = require('https');
  var xml2js = require('xml2js/lib');
  
  module.exports = function(config){
    
    this.accounts = {
      create: function(details, callback){
        request('/accounts', 'POST', callback, js2xml(details,'account'));
      },
      update: function(accountcode, details, callback){
        request('/accounts/'+accountcode, 'PUT', callback, js2xml(details,'account'));
      },
      get: function(accountcode, callback){
        request('/accounts/'+accountcode, 'GET', callback);
      },
      close: function(accountcode, callback){
        request('/accounts/'+accountcode, 'DELETE', callback);
      },
      listAll: function(callback, filter){
        request('/accounts' + ((filter)? '?show='+filter : '' ), 'GET', callback);
      }
    }
    
    this.billingInfo = {
      update: function(accountcode, details, callback){
        request('/accounts/'+accountcode+'/billing_info', 'PUT', callback, js2xml(details,'billing_info'));
      },
      get: function(accountcode, callback){
        request('/accounts/'+accountcode+'/billing_info', 'GET', callback);
      },
      delete: function(accountcode, callback){
        request('/accounts/'+accountcode+'/billing_info', 'DELETE', callback);
      }
    }
    
    //http://docs.recurly.com/api/charges
    this.charges = {
      listAll: function(accountcode, callback, filter){
        request('/accounts/' + accountcode +'/charges'+ ((filter)? '?show='+filter : '' ), 'GET', callback);
      },
      chargeAccount: function(accountcode, details, callback){
        request('/accounts/' + accountcode + '/charges', 'POST', callback, js2xml(details,'charge'));
      }
    }
    
    //http://docs.recurly.com/api/coupons
    this.coupons = {
      getAssociatedWithAccount: function(accountcode, callback){
        request('/accounts/' + accountcode +'/coupon' , 'GET', callback);
      },
      //NOTE: Redeem coupon with subscription not added here since it is a duplication of the subscription creation method
      redeemOnAccount: function(accountcode, details, callback){
        request('/accounts/' + accountcode + '/coupon', 'POST', callback, js2xml(details,'coupon'));
      },
      removeFromAccount: function(accountcode, callback){
        request('/accounts/'+accountcode+'/coupon', 'DELETE', callback);
      }
      
    }
    
    //http://docs.recurly.com/api/credits
    this.credits = {
      listAll: function(accountcode, callback){
        request('/accounts/' + accountcode +'/credits', 'GET', callback);
      },
      creditAccount: function(accountcode, details, callback){
        request('/accounts/' + accountcode + '/credits', 'POST', callback, js2xml(details,'credit'));
      }
    }
    
    //http://docs.recurly.com/api/invoices
    this.invoices = {
      getAssociatedWithAccount: function(accountcode, callback){
        request('/accounts/' + accountcode +'/invoices', 'GET', callback);
      },
      get: function(invoiceid, callback){
        request('/invoices/' + invoiceid, 'GET', callback);
      },
      invoiceAccount: function(accountcode, callback){
        request('/accounts/' + accountcode + '/invoices', 'POST', callback);
      }
    }
    
    //http://docs.recurly.com/api/subscriptions
    this.subscriptions = {
      getAssociatedWithAccount: function(accountcode, callback){
        request('/accounts/' + accountcode +'/subscription', 'GET', callback);
      },
      //**NOTE Certain uses of this method will have implications on PCI compliance because this
      ///      function requires access to and transmission of customer credit card information.
      create: function(accountcode, details, callback){
        request('/accounts/' + accountcode + '/subscription', 'POST', callback, js2xml(details,'subscription'));
      },
      // refundtype can be 'partial', 'full' or 'none'
      refund: function(accountcode, callback, refundtype){
        request('/accounts/' + accountcode +'/subscription'+ ((refundtype)? '?refund='+refundtype : '' ), 'DELETE', callback);
      }
    }
    
    //http://docs.recurly.com/api/subscription-plans
    this.subscriptionPlans = {
      listAll: function(callback){
        request('/company/plans', 'GET', callback);
      },
      get: function(plancode, callback){
        request('/company/plans/' + plancode, 'GET', callback);
      }
      //Create, Update, and Delete are not implemented because the reculy documentation indicates them as advanced cases
    }
    
    //http://docs.recurly.com/api/transactions
    this.transactions = {
      listAll: function(accountcode, callback, filter){
        request('/transactions'+ ((filter)? '?show='+filter : '' ), 'GET', callback);
      },
      getAssociatedWithAccount: function(accountcode, callback){
        request('/accounts/' + accountcode +'/transactions', 'GET', callback);
      },
      get: function(transactionid, callback){
        request('/transactions/' + transactionid, 'GET', callback);
      },
      void: function(transactionid, callback){
        request('/transactions/' + transactionid+ '?action=void', 'DELETE', callback);
      },
      refund: function(transactionid, callback, amount){
        request('/transactions/' + transactionid+ '?action=refund&amount='+amount, 'DELETE', callback);
      },
      //**NOTE Certain uses of this method will have implications on PCI compliance because this
      ///      function requires access to and transmission of customer credit card information.
      createImmediateOneTimeTransaction: function(accountcode, details, callback){
        request('/transactions', 'POST', callback, js2xml(details,'transaction'));
      } 
    }
    
    
    function request(endpoint, method, callback, data){
      if(data){
        data = '<?xml version="1.0"?>\n' + data;
      }
      var options = {
        host: 'api-' + config.ENVIRONMENT + '.recurly.com',
        port: 443,
        path: endpoint,
        method: method,
        headers: {
          Authorization: "Basic "+(new Buffer(config.API_USERNAME+":"+config.API_PASSWORD)).toString('base64'),
          Accept: 'application/xml',
          'Content-Length' : (data) ? data.length : 0
        }
      };
      
      if(method.toLowerCase() == 'post' || method.toLowerCase() == 'put' ){
        options.headers['Content-Type'] = 'application/xml';
        debug(data); 
      }
      debug(options);
      var req = https.request(options, function(res) {
        
        var responsedata = '';
        res.on('data', function(d) {
          responsedata+=d;
        });
        res.on('end', function(){
          responsedata = trim(responsedata);
          debug('Response is: ' + res.statusCode);
          debug(responsedata);
          try{
            var toreturn = {status: 'ok', data: '' };
            if((res.statusCode == 404) || (res.statusCode == 422) || (res.statusCode == 500) || (res.statusCode == 412)){
              toreturn.status = 'error';
              parseXML(responsedata, function(result){
                toreturn.data = result;
                callback(toreturn);
              });
            }
            else if(res.statusCode >= 400){
              toreturn.status = 'error';
              toreturn.data = res.statusCode;
              toreturn.additional = responsedata;
              callback(toreturn);
            }
            else{
              if(responsedata != ''){
                parseXML(responsedata, function(result){
                  toreturn.data = result;
                  callback(toreturn);
                });
              }
              else{
                callback({status: 'ok', description: res.statusCode });
              }
            }
            return;
          }
          catch(e){
            callback({status: 'error', description: e });
          }
        });
      });
      if(data){
        req.write(data);
      }
      req.end();
      req.on('error', function(e) {
        callback({status: 'error', description: e });
      });
    }
    
    function debug(s){
      if(config.DEBUG){
        console.log(s);
      }
    }
  }//end class
  
  /////////////////////////////////////
  //             UTILS               //
  /////////////////////////////////////
  
  function js2xml(js, wraptag){
    if(js instanceof Object){
      return js2xml(Object.keys(js).map(function(key){return js2xml(js[key], key);}).join('\n'), wraptag);
     }else{return ((wraptag)?'<'+ wraptag+'>' : '' ) + js + ((wraptag)?'</'+ wraptag+'>' : '' );}
  }
  
  function parseXML(xml, callback){
    var parser = new xml2js.Parser();
    parser.addListener('end', function(result) {
        callback(result);
    });
    parser.parseString(xml);
  }
  
  function trim(str) {
  	str = str.replace(/^\s+/, '');
  	for (var i = str.length - 1; i >= 0; i--) {
  		if (/\S/.test(str.charAt(i))) {
  			str = str.substring(0, i + 1);
  			break;
  		}
  	}
  	return str;
  }
})();