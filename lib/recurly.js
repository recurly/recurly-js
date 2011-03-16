(function(){
  var https = require('https');
  
  module.exports = function(config){
    
    this.accounts = {
      createAccount: function(details, callback){
        request('/accounts', 'POST', callback, js2xml(details,'account'));
      },
      updateAccount: function(accountcode, details, callback){
        request('/accounts/'+accountcode, 'PUT', callback, js2xml(details,'account'));
      },
      getAccount: function(accountcode, callback){
        request('/accounts/'+accountcode, 'GET', callback);
      },
      closeAccount: function(accountcode, callback){
        request('/accounts/'+accountcode, 'DELETE', callback);
      },
      listAccounts: function(callback, filter){
        request('/accounts' + ((filter)? '?show='+filter : '' ), 'GET', callback);
      }
    }
    
    this.billingInfo = {
      updateBillingInfo: function(accountcode, details, callback){
        request('/accounts/'+accountcode+'/billing_info', 'PUT', callback, js2xml(details,'billing_info'));
      },
      getBillingInfo: function(accountcode, callback){
        request('/accounts/'+accountcode+'/billing_info', 'GET', callback);
      },
      deleteBillingInfo: function(accountcode, callback){
        request('/accounts/'+accountcode+'/billing_info', 'DELETE', callback);
      }
    }
    
    //http://docs.recurly.com/api/charges
    this.charges = {
      
    }
    
    //http://docs.recurly.com/api/coupons
    this.coupons = {
      
    }
    
    //http://docs.recurly.com/api/credits
    this.credits = {
      
    }
    
    //http://docs.recurly.com/api/invoices
    this.invoices = {
      
    }
    
    //http://docs.recurly.com/api/subscriptions
    this.subscriptions = {
      
    }
    
    //http://docs.recurly.com/api/subscription-plans
    this.subscriptionPlans = {
      
    }
    
    //http://docs.recurly.com/api/transactions
    this.transactions = {
      
    }
    
    
    function request(endpoint, method, callback, data){
      data = '<?xml version="1.0"?>\n' + data;
      var options = {
        host: 'api-' + config.ENVIRONMENT + '.recurly.com',
        port: 443,
        path: endpoint,
        method: method,
        headers: {
          Authorization: "Basic "+(new Buffer(config.API_USERNAME+":"+config.API_PASSWORD)).toString('base64'),
          Accept: 'application/json',
          'Content-Length' : data.length
        }
      };
      if(method.toLowerCase() == 'post' || method.toLowerCase() == 'put' ){
        options.headers['Content-Type'] = 'application/xml'; 
      }
      var req = https.request(options, function(res) {
        
        var responsedata = '';
        res.on('data', function(d) {
          responsedata+=d;
        });
        res.on('end', function(){
          responsedata = trim(responsedata);
          console.log('Response is: ' + res.statusCode);
          //console.log(responsedata);
          try{
            var toreturn = {status: 'ok', data: '' };
            if((res.statusCode == 404) || (res.statusCode == 422) || (res.statusCode == 500) || (res.statusCode == 412)){
              toreturn.status = 'error';
              toreturn.data = JSON.parse(responsedata);
            }
            else if(res.statusCode >= 400){
              toreturn.status = 'error';
              toreturn.data = res.statusCode;
              toreturn.additional = responsedata;
            }
            else{
              if(responsedata != ''){
                toreturn.data = JSON.parse(responsedata);
              }
            }
            callback(toreturn);
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
    
  }//end class
  
  /////////////////////////////////////
  //             UTILS               //
  /////////////////////////////////////
  
  function js2xml(js, wraptag){
    if(js instanceof Object){
      return js2xml(Object.keys(js).map(function(key){return js2xml(js[key], key);}).join('\n'), wraptag);
     }else{return ((wraptag)?'<'+ wraptag+'>' : '' ) + js + ((wraptag)?'</'+ wraptag+'>' : '' );}
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