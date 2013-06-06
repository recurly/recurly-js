R.BillingInfo = {
  create: createObject
, toJSON: function() {
    var result = {
      first_name: this.firstName || this.account.firstName
    , last_name: this.lastName || this.account.lastName
    , address1: this.address1
    , address2: this.address2
    , city: this.city
    , state: this.state
    , zip: this.zip
    , country: this.country
    , phone: this.phone
    , vat_number: this.vatNumber
    };

    if(this.paymentMethod == 'paypal') {
      result.payment_method = 'paypal';
    }
    else {
      $.extend(result, {
        number: this.number
      , verification_value: this.cvv
      , month: this.month
      , year: this.year
      });
    }

    return result;
  }
, save: function(options) {
    var json = {
      account: this.account ? this.account.toJSON() : undefined
    , billing_info: this.toJSON()
    , signature: options.signature
    };

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

