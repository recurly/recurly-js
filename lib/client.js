(function(){

var https = require('https'),
    Xml2js = require('xml2js'),
    parser = new Xml2js.Parser({explicitArray: false});

exports.create = function(config){
  config.RECURLY_HOST = 'api.recurly.com';
  return {

    request: function(route, callback, data){
      var endpoint = route[0];
      var method = route[1];
      var that = this;
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
            var toreturn = {status: 'ok', data: '', headers: res.headers };
            if((res.statusCode == 404) || (res.statusCode == 422) || (res.statusCode == 500) || (res.statusCode == 412)){
              toreturn.status = 'error';
              parser.parseString(responsedata, function(err, result){
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
                parser.parseString(responsedata, function(err, result){
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
            return callback({status: 'error', description: e });
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
    },

    debug: function(s){
      if(config.DEBUG){
        console.log(s);
      }
    },

    trim: function(str) {
      str = str.replace(/^\s+/, '');
      for (var i = str.length - 1; i >= 0; i--) {
        if (/\S/.test(str.charAt(i))) {
          str = str.substring(0, i + 1);
          break;
        }
      }
      return str;
    }

  }
}
	
})();