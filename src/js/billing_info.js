R.BillingInfo = {
  create: createObject
, toJSON: function() {    
    return {
      first_name: this.firstName
    , last_name: this.lastName
    , month: this.month
    , year: this.year
    , number: this.number
    , verification_value: this.cvv
    , address1: this.address1
    , address2: this.address2
    , city: this.city
    , state: this.state
    , zip: this.zip
    , country: this.country
    , phone: this.phone
    , vat_number: this.vatNumber
    };
  }
, save: function(options) { 
    var json = {
      billing_info: this.toJSON() 
    , signature: options.signature
    };

    // Save first/last name on the account
    // if not distinguished
    if(!options.distinguishContactFromBillingInfo) {
      json.account = {
        account_code: options.accountCode
      , first_name: this.firstName
      , last_name: this.lastName
      };
    }

    R.ajax({
      url: R.settings.baseURL+'accounts/'+options.accountCode+'/billing_info/update'
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

