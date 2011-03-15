

var Recurly = require('./lib/recurly');



recurly = new Recurly(require('./config'));

recurly.request('/accounts.json', 'GET', function(result){
  console.log(result);
});