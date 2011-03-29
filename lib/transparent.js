(function(){
	
	var qs = require('querystring');
	var crypto = require('crypto');
	var Tools = require('./tools');
	
	var PATH_TRANSPARENT = '/transparent/';
	var PATH_TRANSPARENT_SUBSCRIPTION = '/subscription';
	var PATH_TRANSPARENT_TRANSACTION = '/transaction';
	var PATH_TRANSPARENT_BILLING_INFO = '/billing_info';
	var PATH_TRANSPARENT_RESULTS = 'results/';
	
	var action = {
		CreateSubscription: "subscription",
		UpdateBilling: "billing_info",
		CreateTransaction: "transaction"
	}
	
	///////////////////////////////////
	//            UTILS              //
	///////////////////////////////////
	
	module.exports = function(config){
		
		var t = new Tools(config);
		
		var TRANSPARENT_POST_BASE_URL = config.RECURLY_BASE_URL + PATH_TRANSPARENT + config.subdomain;
		var BILLING_INFO_URL = TRANSPARENT_POST_BASE_URL + PATH_TRANSPARENT_BILLING_INFO;
		var SUBSCRIBE_URL = TRANSPARENT_POST_BASE_URL + PATH_TRANSPARENT_SUBSCRIPTION;
		var TRANSACTION_URL = TRANSPARENT_POST_BASE_URL + PATH_TRANSPARENT_TRANSACTION;
		
		this.hidden_field = function(data){
			return '<input type="hidden" name="data" value="'+t.htmlEscape(encoded_data(data))+'" />';
		}
		
		this.getResults =  function(confirm, result, status, type, callback){
			validateQueryString(confirm, type, status, result)
      t.request('/transparent/results/' + result, 'GET', callback);
    }
		
		function encoded_data(data){
			verify_required_fields(data);
			var query_string = make_query_string(data);
			var validation_string = hash(query_string);
			return validation_string + "|" + query_string;
		}
		
		function verify_required_fields(params){
			if(!params.hasOwnProperty('redirect_url')){
				throw "Missing required parameter: redirect_url";
			}
			if(!params.hasOwnProperty('account[account_code]')){
				throw "Missing required parameter: account[account_code]";
			}
		}
		
		function make_query_string(params){
			params.time = makeDate();
			return buildQueryStringFromSortedObject(makeSortedObject(params, true));
		}
		
		function makeDate(){
			var d = new Date();
			var addleadingzero = function(n){ return (n<10)?'0'+n:''+n };
			return d.getUTCFullYear() + '-' +
			 			 addleadingzero(d.getUTCMonth()+1) + '-' +
			 			 addleadingzero(d.getUTCDate()) + 'T' + 
						 addleadingzero(d.getUTCHours()) + ':' +
						 addleadingzero(d.getUTCMinutes()) + ':' +
						 addleadingzero(d.getUTCSeconds()) + 'Z';
		}
		
		function hash(data) {
			//get the sha1 of the private key in binary
			var shakey = crypto.createHash('sha1');
			shakey.update(config.PRIVATE_KEY);
			shakey = shakey.digest('binary');
			//now make an hmac and return it as hex
			var hmac = crypto.createHmac('sha1', shakey);
			hmac.update(data);
			return hmac.digest('hex');
			//php:  03021207ad681f2ea9b9e1fc20ac7ae460d8d988    <== Yes this sign is identical to the php version
			//node: 03021207ad681f2ea9b9e1fc20ac7ae460d8d988
		 }
		
		function buildQueryStringFromSortedObject(params){
			return params.map(function(p){
				return escape(p.key) + "=" + t.urlEncode(p.value);
			}).join('&');
		}
				
		function makeSortedObject(obj, casesensitive){
		  return Object.keys(obj).map(function(key){
		    return {key: key, value: obj[key]};
		  }).sort(function(a,b){
		    return (casesensitive? a.key : a.key.toLowerCase()) > (casesensitive? b.key : b.key.toLowerCase());
		  });
		}
		
		//Used for validating return params from Recurly
	  function validateQueryString(confirm, type, status, result_key)
	  {
	    var values = {
				result: result_key,
				status: status,
				type: type
			}
	    var query_values = buildQueryStringFromSortedObject(makeSortedObject(values, true));
	    hashed_values = hash(query_values);

	    if(hashed_values !== confirm) {
	      throw "Error: Forged query string";
	    }
			return true;
	  }
		
	}//END CLASS

})();