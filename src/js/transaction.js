
R.Transaction = {
  toJSON: function() {    
    return {
      currency: this.currency
    , amount_in_cents: this.cost.cents()
    };
  }
, create: createObject
, save: function(options) { 
    var json = {
      transaction: this.toJSON() 
    , account: this.account ? this.account.toJSON() : undefined 
    , billing_info: this.billingInfo.toJSON() 
    , signature: options.signature
    };

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


