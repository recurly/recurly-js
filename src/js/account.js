R.Account = {
  create: createObject
, toJSON: function() {    
    return {
      first_name: this.firstName
    , last_name: this.lastName
    , company_name: this.companyName
    , account_code: this.code
    , email: this.email
    };
  }
};

