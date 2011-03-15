(function(){
  var https = require('https');
  
  module.exports = function(config){
    
    
    //Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==
    this.request = function(endpoint, method, callback, data){
      var options = {
        host: 'api-sandbox.recurly.com',
        port: 443,
        path: endpoint,
        method: method,
        headers: {
          Authorization: "Basic "+(new Buffer(config.API_USERNAME+":"+config.API_PASSWORD)).toString('base64')
        }
      };
      var req = https.request(options, function(res) {
        console.log("statusCode: ", res.statusCode);
        console.log("headers: ", res.headers);
        
        var responsedata = '';
        res.on('data', function(d) {
          responsedata+=d;
        });
        res.on('end', function(){
          try{
            callback(JSON.parse(responsedata));
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
  
})();