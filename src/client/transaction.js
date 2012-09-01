var Transaction = {
  create: function(argument) {
    var transaction = createObject(this);
    transaction.billingInfo = BillingInfo.create();
    transaction.account = Account.create();
    return transaction;
  }
, toJSON: function() {
    return {
      account: this.account && this.account.toJSON()
    , billing_info: this.billingInfo.toJSON() 
    };
  }
, save: function(options) { 
    var json = this.toJSON();
    json.signature = options.signature;

    R.ajax({
      url: R.settings.baseURL+'transactions/create'
    , data: json
    , dataType: 'jsonp'
    , jsonp: 'callback'
    , timeout: 60000
    , success: function(data) {
        if(data.success && options.success) {
          options.success(data.success);
        }
        else if(data.errors && options.error) {
          options.error( R.flattenErrors(data.errors) );
        }
      }
    , error: function() {
        if(options.error) {
          options.error(['Unknown error processing transaction. Please try again later.']);
        }
      }
    , complete: options.complete || $.noop
    });
  }
};

R.Transaction = Transaction;
