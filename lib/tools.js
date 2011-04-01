(function(){

var https = require('https');
var xml2js = require('xml2js/lib');
	
module.exports = function(config){
	
	var that = this;
	/////////////////////////////////////////
	//              REQUESTOR              //
	/////////////////////////////////////////

	this.request = function(endpoint, method, callback, data){
    if(data){
      data = '<?xml version="1.0"?>\n' + data;
    }
    var options = {
      host: config.RECURLY_HOST,
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
      that.debug(data); 
    }
    that.debug(options);
    var req = https.request(options, function(res) {
      
      var responsedata = '';
      res.on('data', function(d) {
        responsedata+=d;
      });
      res.on('end', function(){
        responsedata = that.trim(responsedata);
        that.debug('Response is: ' + res.statusCode);
        that.debug(responsedata);
        try{
          var toreturn = {status: 'ok', data: '' };
          if((res.statusCode == 404) || (res.statusCode == 422) || (res.statusCode == 500) || (res.statusCode == 412)){
            toreturn.status = 'error';
            that.parseXML(responsedata, function(result){
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
              that.parseXML(responsedata, function(result){
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
					throw e
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
  

	/////////////////////////////////////
  //             UTILS               //
  /////////////////////////////////////

	this.debug = function(s){
    if(config.DEBUG){
      console.log(s);
    }
  }
  
  this.js2xml = function js2xml(js, wraptag){
    if(js instanceof Object){
      return js2xml(Object.keys(js).map(function(key){return js2xml(js[key], key);}).join('\n'), wraptag);
     }else{return ((wraptag)?'<'+ wraptag+'>' : '' ) + js + ((wraptag)?'</'+ wraptag+'>' : '' );}
  }
  
  this.parseXML = function(xml, callback){
    var parser = new xml2js.Parser();
    parser.addListener('end', function(result) {
        callback(result);
    });
    parser.parseString(xml);
  }
  
  this.trim = function(str) {
  	str = str.replace(/^\s+/, '');
  	for (var i = str.length - 1; i >= 0; i--) {
  		if (/\S/.test(str.charAt(i))) {
  			str = str.substring(0, i + 1);
  			break;
  		}
  	}
  	return str;
  }

	this.htmlEscape = function(html) {
	  return String(html)
	    .replace(/&/g, '&amp;')
	    .replace(/"/g, '&quot;')
	    .replace(/</g, '&lt;')
	    .replace(/>/g, '&gt;');
	};
	
	this.urlEncode = function(toencode){
		return escape(toencode).replace(/\//g,'%2F').replace(/\+/g, '%2B');
	}
	
	this.traverse = function traverse(obj,func, parent) {
		for (i in obj){
			func.apply(this,[i,obj[i],parent]);      
		  if (obj[i] instanceof Object && !(obj[i] instanceof Array)) {
		    traverse(obj[i],func, i);
			}
		}
	}

	this.getPropertyRecursive = function(obj, property){
		var acc = [];
		this.traverse(obj, function(key, value, parent){
			if(key === property){
				acc.push({parent: parent, value: value});
			}
		});
		return acc;
	}

}
	
})();