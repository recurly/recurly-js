var sys = require('sys');
var Recurly = require('./lib/recurly');
var callback = function(result){
  console.log(sys.inspect(result));
};

recurly = new Recurly(require('./config'));
//recurly.accounts.updateAccount('123',{email: 'me8@there.com'},callback);
//recurly.accounts.closeAccount('4566',callback);
//recurly.accounts.listAccounts(callback,'active_subscribers');
//recurly.accounts.getAccount('robrighter@gmail.com',callback);
recurly.billingInfo.deleteBillingInfo('robrighter@gmail.com',callback);