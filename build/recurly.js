//   Recurly.js - v2.1.3
//
//   Communicates with Recurly <https://recurly.com> via a JSONP API,
//   generates UI, handles user error, and passes control to the client
//   to handle the successful events such as subscription creation.
//
//   Example Site: https://js.recurly.com
//
//   (MIT License)
//
//   Copyright (C) 2012 by Recurly, Inc.
//
//   Permission is hereby granted, free of charge, to any person obtaining a copy
//   of this software and associated documentation files (the "Software"), to deal
//   in the Software without restriction, including without limitation the rights
//   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//   copies of the Software, and to permit persons to whom the Software is
//   furnished to do so, subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in
//   all copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//   THE SOFTWARE.


(function($) {
"use strict";

//////////////////////////////////////////////////
// Compiled from src/js/core.js
//////////////////////////////////////////////////

// Non-intrusive Object.create
function createObject(o) {
  function F() {}
  F.prototype = o || this;
  return new F();
};

var R = {}; 
R.settings = {
  enableGeoIP: true
, acceptedCards: ['american_express', 'discover', 'mastercard', 'visa']
, oneErrorPerField: true
};

R.version = '2.1.3';

R.dom = {};

R.Error = {
  toString: function() {
    return 'RecurlyJS Error: ' + this.message;
  }
};

R.raiseError = function(message) {
  var e = createObject(R.Error);
  e.message = message;
  throw e;
};


R.config = function(settings) { 
  $.extend(true, R.settings, settings); 

  if(!settings.baseURL) {
    R.settings.baseURL = 'https://api.recurly.com/jsonp/'; 
    var subdomain = R.settings.subdomain || R.raiseError('company subdomain not configured');
    R.settings.baseURL += subdomain + '/';
  }
};


function pluralize(count, term) {
  if(count == 1) {
    return term.substr(0,term.length-1);
  }

  return '' + count + ' ' + term;
}

// Immutable currency-amount object
// This will eventually handle multi-currency
// where it will store a list of costs per currency
// and accessors will return the appropriate one
// based on the current currency
//

(R.Cost = function(cents) {
  this._cents = cents || 0; 
}).prototype = {
  toString: function() {
    return R.formatCurrency(this.dollars());
  }
, cents: function(val) {
    if(val === undefined)
      return this._cents;

    return new Cost(val);
  }
, dollars: function(val) {
    if(val === undefined)
      return this._cents/100;

    return new R.Cost(val*100);
  }
, mult: function(n) {
    return new R.Cost(this._cents * n);
  }
, add: function(n) {
    if(n.cents) n = n.cents();
    return new R.Cost(this._cents + n);
  }
, sub: function(n) {
    if(n.cents) n = n.cents();
    return new R.Cost(this._cents - n);
  }
};

R.Cost.FREE = new R.Cost(0);

(R.TimePeriod = function(length,unit) { 
    this.length = length;
    this.unit = unit;
}).prototype = {
  toString: function() {
    return '' + pluralize(this.length, this.unit);
  }
, toDate: function() {
    var d = new Date();
    switch(this.unit) {
      case 'month':
        d.setMonth( d.getMonth() + this.length );
        break;
      case 'day':
        d.setDay( d.getDay() + this.length );
        break;
    }
    return d;
  }
, clone: function() {
    return new R.TimePeriod(this.length,this.unit);
  }
};

(R.RecurringCost = function(cost,interval) {
  this.cost = cost;
  this.interval = interval;
}).prototype = {
  toString: function() {
    return '' + this.cost  + ' every ' + this.interval;
  }
, clone: function() {
    return new R.TimePeriod(this.length,this.unit);
  }
};

R.RecurringCost.FREE = new R.RecurringCost(0,null);

(R.RecurringCostStage = function(recurringCost, duration) {
  this.recurringCost = recurringCost;
  this.duration = duration;
}).prototype = {
  toString: function() {
    this.recurringCost.toString() + ' for ' + this.duration.toString();
  }
};




//////////////////////////////////////////////////
// Compiled from src/js/locale.js
//////////////////////////////////////////////////

R.locale = {};

R.locale.errors = {
  emptyField: 'Required field'
, missingFullAddress: 'Please enter your full address.'
, invalidEmail: 'Invalid'
, invalidCC: 'Invalid'
, invalidCVV: 'Invalid'
, invalidCoupon: 'Invalid'
, cardDeclined: 'Transaction declined' 
, acceptTOS: 'Please accept the Terms of Service.' 
, invalidQuantity: 'Invalid quantity' 
};

R.locale.currencies = {};

R.locale.currency = {
  format: "%u%n"
, separator: "."
, delimiter: ","
, precision: 2
};

function C(key, def) {
  var c = R.locale.currencies[key] = createObject(R.locale.currency);
  for(var p in def) {
    c[p] = def[p];
  }
};

C('USD', {
  symbol: '$'
});

C('AUD', {
  symbol: '$'
});

C('CAD', {
  symbol: '$'
});

C('EUR', {
  symbol: '\u20ac'
});

C('GBP', {
  symbol: '\u00a3'
});

C('CZK', {
  symbol: '\u004b'
});

C('DKK', {
  symbol: '\u006b\u0072'
});

C('HUF', {
  symbol: 'Ft'
});

C('JPY', {
  symbol: '\u00a5'
});

C('NOK', {
  symbol: 'kr'
});

C('NZD', {
  symbol: '$'
});

C('PLN', {
  symbol: '\u007a'
});

C('SGD', {
  symbol: '$'
});

C('SEK', {
  symbol: 'kr'
});

C('CHF', {
  symbol: 'Fr'
});

C('ZAR', {
  symbol: 'R'
});



R.settings.locale = R.locale;


//////////////////////////////////////////////////
// Compiled from src/js/utils.js
//////////////////////////////////////////////////

R.knownCards = {
  'visa': {
    prefixes: [4]
  , name: 'Visa'
  }
, 'mastercard': {
    prefixes: [51, 52, 53, 54, 55]
  , name: 'MasterCard'
  }
, 'american_express': {
    prefixes: [34, 37]
  , name: 'American Express'
  }
, 'discover': {
    prefixes: [6011, 62, 64, 65]
  , name: 'Discover'
  }
, 'diners_club': {
    prefixes: [305, 36, 38]
  , name: 'Diners Club'
  }
, 'carte_blanche': {
    prefixes: [300, 301, 302, 303, 304, 305]
  }
, 'jcb': {
    prefixes: [35]
  , name: 'JCB'
  }
, 'enroute': {
    prefixes: [2014, 2149]
  , name: 'EnRoute'
  }
, 'maestro': {
    prefixes: [5018, 5020, 5038, 6304, 6759, 6761]
  , name: 'Maestro'
  }
, 'laser': {
    prefixes: [6304, 6706, 6771, 6709]
  , name: 'Laser'
  }
};

// Credit card type functions
R.detectCardType = function(cardNumber) {
  cardNumber = cardNumber.replace(/\D/g, '');
  var cards = R.knownCards;

  for(var ci in cards) {
    if(cards.hasOwnProperty(ci)) {
      var c = cards[ci];
      for(var pi=0,pl=c.prefixes.length; pi < pl; ++pi) {
        if(c.prefixes.hasOwnProperty(pi)) {
          var p = c.prefixes[pi];
          if (new RegExp('^' + p.toString()).test(cardNumber))
            return ci;
        }
      }
    }
  }

  return false;
};


// Formats currency amount in the current denomination or one provided
// based on R.locale.currencies rules
R.formatCurrency = function(num,denomination) {

  if(num < 0) {
    num = -num;
    var negative = true;
  }
  else {
    var negative = false;
  }

  denomination = denomination || R.settings.currency ||
    R.raiseError('currency not configured');

  var langspec = R.locale.currency;
  var currencyspec = R.locale.currencies[denomination];

  // Format to precision
  var str = num.toFixed(currencyspec.precision);

  // Replace default period with format separator
  if(langspec.separator != '.') {
    str = str.replace(/\./g, langspec.separator);
  }

  function insertDelimiters(str) {
    var sRegExp = new RegExp('(-?[0-9]+)([0-9]{3})');
    while(sRegExp.test(str)) {
      str = str.replace(sRegExp, '$1'+langspec.delimiter+'$2');
    }
    return str;
  }

  // Apply thousands delimiter
  str = insertDelimiters(str);

  // Format unit/number order
  var format = langspec.format;
  format = format.replace(/%u/g, currencyspec.symbol);
  format = format.replace(/%n/g, str);
  str = format;

  if(negative) {
    str = '-' + str;
  }

  return str;
};

var euCountries = ["AT","BE","BG","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","GB"];
R.isCountryInEU = function(country) {
  return $.inArray(country, euCountries) !== -1;
}

R.isVATNumberApplicable = function(buyerCountry, sellerCountry) {
  if(!R.settings.VATPercent) return false;

  if(!R.settings.country) {
    R.raiseError('you must configure a country for VAT to work');
  }

  if(!R.isCountryInEU(R.settings.country)) {
    R.raiseError('you cannot charge VAT outside of the EU');
  }

  // Outside of EU don't even show the number
  if(!R.isCountryInEU(buyerCountry)) {
    return false;
  }

  return true;
}

R.isVATChargeApplicable = function(buyerCountry, vatNumber) {
  // We made it so the VAT Number is collectable in any case
  // where it could be charged, so this is logically sound:
  if(!R.isVATNumberApplicable(buyerCountry)) return false;

  var sellerCountry = R.settings.country;

  // 1) Outside EU never pays
  // 2) Same country in EU always pays
  // 3) Different countries in EU, pay only without vatNumber
  return (sellerCountry == buyerCountry || !vatNumber);
};

R.flattenErrors = function(obj, attr) {
  var arr = [];

  var attr = attr || '';

  if(  typeof obj == 'string'
    || typeof obj == 'number'
    || typeof obj == 'boolean') {

    if (attr == 'base') {
      return [obj];
    }

    return ['' + attr + ' ' + obj];
  }

  for(var k in obj) {
    // console.log(k);
    if(obj.hasOwnProperty(k)) {
      // Inherit parent attribute names when property key
      // is a numeric string; how we deal with arrays
      attr = (parseInt(k).toString() == k) ? attr : k;
      var children = R.flattenErrors(obj[k], attr);
      for(var i=0, l=children.length; i < l; ++i) {
        arr.push(children[i]);
      }
    }
  }

  return arr;
};

// Very small function, but defining for D.R.Y.ness
R.getToken = function(response) {
  var token = response.token || 'INVALIDTOKEN';
  return token;
}

// POST the results from Recurly to the merchant's webserver
R.postResult = function(url, originalResponse, options) {
  var token = R.getToken(originalResponse);

  var form = $('<form />').hide();
  form.attr('action', url)
      .attr('method', 'POST')
      .attr('enctype', 'application/x-www-form-urlencoded');

  $('<input type="hidden" />').attr({name: 'recurly_token', value: token}).appendTo(form);

  $('body').append(form);
  form.submit();
};

function jsonToSelect(obj) {
  var $select = $('<select>');

  for(var k in obj) {
    if(obj.hasOwnProperty(k)) {
      var v = obj[k];
      $select.append('<option value='+k+'>'+v+'</option>');
    }
  }

  return $select;
};

R.enforce = function(obj) {
  return {
    enforced: obj
  , hidden: false
  , hide: function() {
      this.hidden = true;
      return this;
    }
  };
};


function cc2lcu(obj) {
  obj = obj || this;

  if(typeof obj == 'string') {
    return obj.replace(/([a-z])([A-Z])/g, function (a, l, u) {
        return l+'_'+u;
    }).toLowerCase();
  }
  else {
    for(var k in obj) {
      if(obj.hasOwnProperty(k)) {

      }
    }
  }
}


R.ajax = function(options) {
  options.data = $.extend({js_version: R.version}, options.data);
  return $.ajax(options);
};


function errorDialog(message) {
  $('body').append(R.dom.error_dialog);
}


//////////////////////////////////////////////////
// Compiled from src/js/validators.js
//////////////////////////////////////////////////


(R.isValidCC = function($input) {
  var v = $input.val();

  // Strip out all non digits 
  v = v.replace(/\D/g, "");

  if(v == "") return false;

  var nCheck = 0,
      nDigit = 0,
      bEven = false;


  for (var n = v.length - 1; n >= 0; n--) {
    var cDigit = v.charAt(n);
    var nDigit = parseInt(cDigit, 10);
    if (bEven) {
      if ((nDigit *= 2) > 9)
        nDigit -= 9;
    }
    nCheck += nDigit;
    bEven = !bEven;
  }

  return (nCheck % 10) == 0;
}).defaultErrorKey = 'invalidCC';

(R.isValidEmail = function($input) {
  var v = $input.val();
  return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(v);
}).defaultErrorKey = 'invalidEmail';

function wholeNumber(val) {
  return /^[0-9]+$/.test(val);
}

(R.isValidCVV = function($input) {
  var v = $input.val();
  return (v.length == 3 || v.length == 4) && wholeNumber(v);
}).defaultErrorKey = 'invalidCVV';

(R.isNotEmpty = function($input) {
  var v = $input.val();
  if($input.is('select')) {
    if(v == '-' || v == '--') return false;
  }
  return !!v;
}).defaultErrorKey = 'emptyField';
// State is required if its a dropdown, it is not required if it is an input box
(R.isNotEmptyState = function($input) {
  var v = $input.val();
  if($input.is('select')) {
    if(v == '-' || v == '--') return false;
  }
  return true;
}).defaultErrorKey = 'emptyField';

(R.isChecked = function($input) {
  return $input.is(':checked');
}).defaultErrorKey = 'acceptTOS';

(R.isValidQuantity = function($input) {
  return /^[0-9]*$/.test($input.val());
}).defaultErrorKey = 'invalidQuantity';



//////////////////////////////////////////////////
// Compiled from src/js/plan.js
//////////////////////////////////////////////////

R.Plan = {
  create: createObject
, fromJSON: function(json) {
    var p = this.create();

    p.name = json.name;
    p.code = json.plan_code;
    p.currency = json.currency;
    p.cost = new R.Cost(json.unit_amount_in_cents);

    p.displayQuantity = json.display_quantity;

    p.interval = new R.TimePeriod(
        json.plan_interval_length,
        json.plan_interval_unit
      );

    if(json.trial_interval_length) {
      p.trial = new R.TimePeriod(
          json.trial_interval_length,
          json.trial_interval_unit
        );
    }

    if(json.setup_fee_in_cents) {
      p.setupFee = new R.Cost(json.setup_fee_in_cents);
    }

    if (json.vat_percentage) {
      R.settings.VATPercent = parseFloat(json.vat_percentage);
    }

    if (json.merchant_country) {
      R.settings.country = json.merchant_country;
    }

    p.addOns = [];
    if(json.add_ons) {
      for(var l=json.add_ons.length, i=0; i < l; ++i) {
        var a = json.add_ons[i];
        p.addOns.push(R.AddOn.fromJSON(a));
      }
    }

    return p;
  }
, get: function(plan_code, currency, callback) {
    $.ajax({
      url: R.settings.baseURL+'plans/'+plan_code+"?currency="+currency,
      // data: params,
      dataType: "jsonp",
      jsonp: "callback",
      timeout: 10000,
      success: function(data) {
        var plan = R.Plan.fromJSON(data);
        callback(plan);
      }
    });
  }
, createSubscription: function() {
    var s = createObject(R.Subscription);
    s.plan = createObject(this);
    s.plan.quantity = 1;
    s.addOns = [];
    return s;
  }
};

R.AddOn = {
  fromJSON: function(json) {
    var a = createObject(R.AddOn);
    a.name = json.name;   
    a.code = json.add_on_code;
    a.cost = new R.Cost(json.default_unit_amount_in_cents);
    a.displayQuantity = json.display_quantity;
    return a;
  }

, toJSON: function() {
    return {
      name: this.name
    , add_on_code: this.code
    , default_unit_amount_in_cents: this.default_unit_amount_in_cents
    };
  }
};


//////////////////////////////////////////////////
// Compiled from src/js/account.js
//////////////////////////////////////////////////

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



//////////////////////////////////////////////////
// Compiled from src/js/billing_info.js
//////////////////////////////////////////////////

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



//////////////////////////////////////////////////
// Compiled from src/js/subscription.js
//////////////////////////////////////////////////

// Base Subscription prototype
R.Subscription = {
  create: createObject
, plan: R.Plan
, addOns: []

, calculateTotals: function() {
    var totals = {
      stages: {}
    };

    // PLAN
    totals.plan = this.plan.cost.mult(this.plan.quantity);

    // ADD-ONS
    totals.allAddOns = new R.Cost(0);
    totals.addOns = {};
    for(var l=this.addOns.length, i=0; i < l; ++i) {
      var a = this.addOns[i],
          c = a.cost.mult(a.quantity);
      totals.addOns[a.code] = c;
      totals.allAddOns = totals.allAddOns.add(c);
    }

    totals.stages.recurring = totals.plan.add(totals.allAddOns);

    totals.stages.now = totals.plan.add(totals.allAddOns);

    // FREE TRIAL 
    if(this.plan.trial) {
      totals.stages.now = R.Cost.FREE; 
    }

    // COUPON
    if(this.coupon) {
      var beforeDiscount = totals.stages.now;
      var afterDiscount = totals.stages.now.discount(this.coupon);
      totals.coupon = afterDiscount.sub(beforeDiscount);
      totals.stages.now = afterDiscount;
    }

    // SETUP FEE
    if(this.plan.setupFee) {
      totals.stages.now = totals.stages.now.add(this.plan.setupFee);
    }

    // VAT
    if(this.billingInfo && R.isVATChargeApplicable(this.billingInfo.country,this.billingInfo.vatNumber)) {
      totals.vat = totals.stages.now.mult( (R.settings.VATPercent/100) );
      totals.stages.now = totals.stages.now.add(totals.vat);
    }

    return totals;
  }
, redeemAddOn: function(addOn) {
  var redemption = addOn.createRedemption();
  this.addOns.push(redemption); 
  return redemption;
}

, removeAddOn: function(code) {
  for(var a=this.addOns, l=a.length, i=0; i < l; ++i) {
    if(a[i].code == code) {
      return a.splice(i,1);
    }
  }
}

, findAddOnByCode: function(code) {
    for(var l=this.addOns.length, i=0; i < l; ++i) {
      if(this.addOns[i].code == code) {
        return this.addOns[i];
      }
    }
    return false;
  }

, toJSON: function() {
    var json = {
      plan_code: this.plan.code
    , quantity: this.plan.quantity
    , currency: this.plan.currency
    , coupon_code: this.coupon ? this.coupon.code : undefined
    , add_ons: []
    };

    for(var i=0, l=this.addOns.length, a=json.add_ons, b=this.addOns; i < l; ++i) {
      a.push({
        add_on_code: b[i].code
      , quantity: b[i].quantity
      });
    }

    return json;
  }

, save: function(options) {
    var json = {
      subscription: this.toJSON()
    , account: this.account.toJSON()
    , billing_info: this.billingInfo.toJSON()
    , signature: options.signature
    };

    R.ajax({
      url: R.settings.baseURL+'subscribe',
      data: json,
      dataType: "jsonp",
      jsonp: "callback",
      timeout: 60000,
      success: function(data) {
        if(data.success && options.success) {
          options.success(data.success);
        }
        else if(data.errors && options.error) {
          var errorCode = data.errors.error_code;
          delete data.errors.error_code;
          options.error( R.flattenErrors(data.errors), errorCode );
        }
      },
      error: function() {
        if(options.error) {
          options.error(['Unknown error processing transaction. Please try again later.']);
        }
      },
      complete: options.complete
    });

  }
};

R.AddOn.createRedemption = function(qty) {
  var r = createObject(this);
  r.quantity = qty || 1;
  return r;
};

R.Coupon = {
  fromJSON: function(json) {
    var c = createObject(R.Coupon);

    if(json.discount_in_cents)
      c.discountCost = new R.Cost(-json.discount_in_cents);
    else if(json.discount_percent)
      c.discountRatio = json.discount_percent/100;

    c.description = json.description;

    return c;
  }

, toJSON: function() {
  }
};

R.Cost.prototype.discount = function(coupon){ 
  if(coupon.discountCost)
    return this.add(coupon.discountCost);
  
  var ret = this.sub( this.mult(coupon.discountRatio) );
  if(ret.cents() < 0) {
    return R.Cost.FREE;
  }

  return ret;
};

R.Subscription.getCoupon = function(couponCode, successCallback, errorCallback) {

  if(!R.settings.baseURL) { R.raiseError('Company subdomain not configured'); }

  var couponCurrencyQuery = (R.settings.currency !== undefined ? '?currency='+R.settings.currency : '');

  return R.ajax({
    url: R.settings.baseURL+'plans/'+this.plan.code+'/coupons/'+couponCode+couponCurrencyQuery,
    // data: params,
    dataType: "jsonp",
    jsonp: "callback",
    timeout: 10000,
    success: function(data) {
      if(data.valid) {
        var coupon = R.Coupon.fromJSON(data);
        coupon.code = couponCode;
        successCallback(coupon);
      }
      else {
        errorCallback();
      }
    },
    error: function() {
      errorCallback();
    }
  });
};



//////////////////////////////////////////////////
// Compiled from src/js/transaction.js
//////////////////////////////////////////////////


R.Transaction = {
 // Note - No toJSON function for this object, all parameters must be signed.
 create: createObject
, save: function(options) { 
    var json = {
      account: this.account ? this.account.toJSON() : undefined 
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




//////////////////////////////////////////////////
// Compiled from src/js/ui.js
//////////////////////////////////////////////////

R.UserError = {};

function raiseUserError(validation, elem) {
  var e = createObject(R.UserError);
  e.validation = validation;
  e.element = elem;
  throw e;
}

function invalidMode(e) { 
  var $input = e.element;
  var message = R.locale.errors[e.validation.errorKey];
  var validator = e.validation.validator;

  var $e = $('<div class="error">');
  $e.text(message);
  $e.appendTo($input.parent());

  $input.addClass('invalid');
  $input.bind('change keyup', function handler(e) { 

    if(validator($input)) {
      $input.removeClass('invalid');
      $e.remove();
      $input.unbind(e);
    }
  });
}

function validationGroup(pull,success) {
  var anyErrors = false;
  var puller = {
    field: function($form, fieldSel, validations) {
      validations = Array.prototype.slice.call(arguments, 2);
      return pullField($form, fieldSel, validations, function onError(error) {
        if(!anyErrors) error.element.focus();
        invalidMode(error);
        anyErrors = true;

        if(R.settings.oneErrorPerForm)
          throw {stopPulling:true};
      });
    }
  };


  try {
    pull(puller);
  }
  catch(e) {
    if(!e.stopPulling) {
      throw e;
    }
  }

  if(!anyErrors) {
    success();
  }
}


function pullField($form, fieldSel, validations, onError) {
  // Try text input
  var $input = $form.find(fieldSel + ' input');

  // Try as select
  if($input.length == 0) {
    $input = $form.find(fieldSel + ' select');
  }

  // Treat nonexistence as removed deliberately
  if($input.length == 0) return undefined;

  var val = $input.val();

  for(var i=0,l=validations.length; i < l; ++i) {
    var v = validations[i];

    if(!v.validator($input)) {
      onError({ 
        element: $input
      , validation: v
      });

      if(R.settings.oneErrorPerField)
        break;
    }
  }

  return val;
}


// Make a 'validation' from validator / errorKey
function V(v,k) {
  return {
    validator: v,
    errorKey: k || v.defaultErrorKey
  };
}


// == SERVER ERROR UI METHODS

function clearServerErrors($form) {  
  var $serverErrors = $form.find('.server_errors');
  $serverErrors.removeClass('any').addClass('none');
  $serverErrors.empty();
}

function displayServerErrors($form, errors) {
  var $serverErrors = $form.find('.server_errors');
  clearServerErrors($form);

  var l = errors.length;
  if(l) {
    $serverErrors.removeClass('none').addClass('any');
    for(var i=0; i < l; ++i) {
      var $e = $('<div class="error">');
      $e.text(errors[i]);
      $serverErrors.append($e);
    }
  }
}


var preFillMap = {
  account: {
    firstName:      '.contact_info > .full_name > .first_name > input'
  , lastName:       '.contact_info > .full_name > .last_name > input'
  , email:          '.contact_info > .email > input'
  , phone:          '.contact_info > .phone > input'
  , companyName:    '.contact_info > .company_name > input'
  }
, billingInfo: {
    firstName:      '.billing_info > .credit_card > .first_name > input'
  , lastName:       '.billing_info > .credit_card > .last_name > input'
  , address1:       '.billing_info > .address > .address1 > input'
  , address2:       '.billing_info > .address > .address2 > input'
  , country:        '.billing_info > .address > .country > select'
  , city:           '.billing_info > .address > .city > input'
  , state:          '.billing_info > .address > .state_zip > .state > input'
  , zip:            '.billing_info > .address > .state_zip > .zip > input'
  , vatNumber:      '.billing_info > .vat_number > input'

  , cardNumber:     '.billing_info  .card_number > input'
  , CVV:      '.billing_info  .cvv > input'
  }
, subscription: {
    couponCode:     '.subscription > .coupon > .coupon_code > input'
  }
};

function preFillValues($form, options, mapObject) {

  (function recurse(preFill,mapObject,keypath) {

    if(!preFill) return;

    for(var k in preFill) {
      if(preFill.hasOwnProperty(k) && mapObject.hasOwnProperty(k)) {

        var v = preFill[k];
        var selectorOrNested = mapObject[k];
        var lcuk = cc2lcu(k);
        var keypath2 = keypath ? (keypath+'.'+lcuk) : lcuk;


        // jquery selector
        if(typeof selectorOrNested == 'string') {

          var $input = $form.find(selectorOrNested);
          $input.val(v).change();
        }
        // nested mapping
        else if(typeof selectorOrNested == 'object') {
          recurse(v, selectorOrNested, keypath2);
        }
      }
    }
  })(options,mapObject);
}


function initCommonForm($form, options) {

  if(!options.collectPhone) {
    $form.find('.phone').remove();
  }

  if(!options.collectCompany) {
    $form.find('.company_name').remove();
  }

  $form.delegate('.placeholder', 'click', function() {
    var $label = $(this);
    var $li = $(this).parent();
    $li.find('input').focus();
  });

  $form.delegate('input', 'change keyup', function() {
    var $input = $(this);
    var $li = $(this).parent(); 

    if($input.val().length > 0) {
      $li.find('.placeholder').hide();
    }
    else {
      $li.find('.placeholder').show();
    }
  });


  $form.delegate('input', 'focus', function() {
    $(this).parent().addClass('focus');
  });

  $form.delegate('input', 'blur', function() {
    $(this).parent().removeClass('focus');
  });

  $form.delegate('input', 'keydown', function(e) {
    if(e.keyCode >= 48 && e.keyCode <= 90) {
      $(this).parent().find('.placeholder').hide();
    }
  });
  
  preFillValues($form, options, preFillMap);
}

function initContactInfoForm($form, options) {

  // == FIRSTNAME / LASTNAME REDUNDANCY
  if(options.distinguishContactFromBillingInfo) { 
    var $contactFirstName = $form.find('.contact_info .first_name input');
    var $contactLastName = $form.find('.contact_info .last_name input');
    var prevFirstName = $contactFirstName.val(); 
    var prevLastName = $contactLastName.val(); 
    $form.find('.contact_info .first_name input').change(function() {
      var $billingFirstName = $form.find('.billing_info .first_name input'); 
      if($billingFirstName.val() == prevFirstName) {
        $billingFirstName.val( $(this).val() ).change();
      }
      prevFirstName = $contactFirstName.val();
    });
    $form.find('.contact_info .last_name input').change(function() {
      var $billingLastName = $form.find('.billing_info .last_name input'); 
      if($billingLastName.val() == prevLastName) {
        $billingLastName.val( $(this).val() ).change();
      }
      prevLastName = $contactLastName.val();
    });

  }
  else {
    $form.find('.billing_info .first_name, .billing_info .last_name').remove();
  }

}

function initBillingInfoForm($form, options) {

  // == SWAPPING OF STATE INPUT WITH SELECT
  var $countrySelect = $form.find('.country select');
  var $state = $form.find('.state');
  var $stateInput = $state.find('input');
  var $manualStateInput = $state.children();
  var $savedStateSelect = {};
  var knownStates = R.states;
  var prevCountry = $countrySelect.val();

  function matchKnownStateWithInput(country, stateStr) {
    var ref = knownStates[country];
    // Normalize stateStr
    stateStr = $.trim(stateStr.toUpperCase());

    // Is a state code
    if(ref.hasOwnProperty(stateStr)) {
      return stateStr;
    }

    // Search through state names to find the code 
    for(var k in ref) {
      if(ref.hasOwnProperty(k)) {
        var v = ref[k];
        if(stateStr == v.toUpperCase()) {
          return k;
        }
      }
    }

    return false;
  }

  function swapStateSelectOrInput(country, state) {
    var inSelectMode = $state.hasClass('select_mode');
    if(country == 'US' || country == 'CA') {
      if(!inSelectMode || prevCountry != country) {
        var manualVal = $state.find('input').val();

        if(manualVal != undefined  && manualVal != '') {
          state = matchKnownStateWithInput(country, manualVal);

          if(!state) return false;
        }

        // Change to select mode
        $state.addClass('select_mode');
        // Detatch manual-input children from field
        $state.children().detach();
        // Instantiate HTML DOM only now, and cache it
        $savedStateSelect[country] = $savedStateSelect[country] || jsonToSelect(knownStates[country]);
        // Insert select into field
        $state.append($savedStateSelect[country]);
        // Set known state, if provided
        if(state) $state.find('select').val(state);
      }
 
    }
    else if(inSelectMode) {
      // Restore original manual state input field
      $state.empty().append($manualStateInput).removeClass('select_mode');
    }
  }

  $stateInput.bind('change keyup', function() {
    swapStateSelectOrInput(prevCountry);
  });

  $countrySelect.change(function() {
    var country = $(this).val();
    swapStateSelectOrInput(country);
    prevCountry = country;
  });

  // == GEOIP
  function niceSet($jq, v) {
    var cur = $jq.val();
    if(!v || v == '') return false;
    if(cur && cur != '' && cur != '-') return false;

    // workaround
    // 
    // this workaround is specifically for GEOIP, where data may arrive later than
    // DOM listener (it uses DOM values for VAT logic). By triggering a change event,
    // it manually triggers the DOM listener responsible for applying VAT
    //
    // the right way to fix this is to first get all data, then calculate virtual attributes
    // and finally do DOM
    // but that requires a lot of time and work refactoring, and probably needs a MVVM style design
    return $jq.val(v).change();
  }
 
  if(options.enableGeoIP) {
    $.ajax({
      url: R.settings.baseURL+'location',
      dataType: "jsonp",
      jsonp: "callback",
      success: function(data) {
        if(data.country) {
          niceSet($countrySelect, data.country);
          swapStateSelectOrInput(data.country, data.state);
        }
      }
    });
  }
  else {
    // == DEFAULT BUYER TO SELLER COUNTRY
    if(R.settings.country) {
      var $countryOpt = $form.find('.country option[value='+R.settings.country+']');
      if($countryOpt.length) {
        $countryOpt.attr('selected', true).change();
      }
    }
  }

  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var $yearSelect = $form.find('.year select');
  var $monthSelect = $form.find('.month select');

  // == GENERATE YEAR SELECT OPTIONS
  for(var i=year; i <= year+10; ++i) {
    var $yearOpt = $('<option name="'+i+'">'+i+'</option>');
    $yearOpt.appendTo($yearSelect);
  }
  $yearSelect.val(year+1);


  // == DISABLE INVALID MONTHS, SELECT CURRENT
  function updateMonths() {
    if($yearSelect.val() == year) {
      var foundSelected = false; // If we've set a selection yet

      if($monthSelect.val() > month) {
        // We know the current selection is already valid
        foundSelected = true;
      }

      $monthSelect.find('option').each(function(){
        if($(this).val() <= month) {
          $(this).attr('disabled', true);
        }
        else {
          $(this).removeAttr('disabled');

          if(!foundSelected) {
            $(this).attr('selected', true);
            foundSelected = true;
          }
        }
      });
    }
    else {
      $monthSelect.find('option').removeAttr('disabled');
    }
  };
  updateMonths();
  $yearSelect.change(updateMonths);


  // == HIDE UNNECESSARY ADDRESS FIELDS

  if(options.addressRequirement == 'none') {
    $form.find('.address').remove();
  }
  else if(options.addressRequirement == 'zip') {
    $form.find('.address').addClass('only_zip');
    $form.find('.address1, .address2, .city, .state').remove();   
    
    // Only remove country if no VAT support
    if(!R.settings.VATPercent) {
      $form.find('.country').remove();
    }
  }
  else if(options.addressRequirement == 'zipstreet') {
    $form.find('.address').addClass('only_zipstreet');
    $form.find('.city, .state').remove(); 

    // Only remove country if no VAT support
    if(!R.settings.VATPercent) {
      $form.find('.country').remove();
    }
  }
  else if(options.addressRequirement == 'full') {
    $form.find('.address').addClass('full');
  }
  // == BUILD ACCEPTED CARDS DOM
  var $acceptedCards = $form.find('.accepted_cards');

  if(options.acceptedCards) {
    var a = options.acceptedCards
      , l = a.length;

    for(var i=0; i < l; ++i) {
      var cardId = a[i];
      var $card = $('<div class="card '+cardId+'">');
      var card = R.knownCards[cardId];
      if(card && card.name) {
        $card.text(card.name);
      }
      $acceptedCards.append($card);
    }
  }

  // == SHOW/HIDE CARD TYPES
  $form.find('.card_number input').bind('change keyup', function() {
    var type = R.detectCardType( $(this).val() );
    if(type) {
      $acceptedCards.find('.card').each(function(){
        $(this).toggleClass('match', $(this).hasClass(type));
        $(this).toggleClass('no_match', !$(this).hasClass(type));
      });
    }
    else {
      $acceptedCards.find('.card').removeClass('match no_match'); 
    }
  }); 
}


function pullAccountFields($form, account, options, pull) {
  account.firstName = pull.field($form, '.contact_info .first_name', V(R.isNotEmpty)); 
  account.lastName = pull.field($form, '.contact_info .last_name', V(R.isNotEmpty)); 
  account.companyName = pull.field($form, '.contact_info .company_name'); 
  account.email = pull.field($form, '.email', V(R.isNotEmpty), V(R.isValidEmail)); 
  account.code = options.accountCode || 
    (options.account && (options.account.code || options.account.accountCode));
}


function pullBillingInfoFields($form, billingInfo, options, pull) {
  billingInfo.firstName = pull.field($form, '.billing_info .first_name', V(R.isNotEmpty)); 
  billingInfo.lastName = pull.field($form, '.billing_info .last_name', V(R.isNotEmpty)); 
  billingInfo.number = pull.field($form, '.card_number', V(R.isNotEmpty), V(R.isValidCC)); 
  billingInfo.cvv = pull.field($form, '.cvv', V(R.isNotEmpty), V(R.isValidCVV)); 

  billingInfo.month = pull.field($form, '.month');
  billingInfo.year = pull.field($form, '.year');

  billingInfo.phone = pull.field($form, '.phone');
  billingInfo.address1 = pull.field($form, '.address1', V(R.isNotEmpty));
  billingInfo.address2 = pull.field($form, '.address2');
  billingInfo.city = pull.field($form, '.city', V(R.isNotEmpty));
  billingInfo.state = pull.field($form, '.state', V(R.isNotEmptyState));
  billingInfo.zip = pull.field($form, '.zip', V(R.isNotEmpty));
  billingInfo.country = pull.field($form, '.country', V(R.isNotEmpty));
}


function pullPlanQuantity($form, plan, options, pull) {
  var qty = pull.field($form, '.plan .quantity', V(R.isValidQuantity));
  // An empty quantity field indicates 1
  plan.quantity = qty || 1;
}


function verifyTOSChecked($form, pull) {
  pull.field($form, '.accept_tos', V(R.isChecked)); 
}


R.buildBillingInfoUpdateForm = function(options) {
  var defaults = {
    addressRequirement: 'full'
  , distinguishContactFromBillingInfo: true 
  };

  options = $.extend(createObject(R.settings), defaults, options);

  if(!options.accountCode) R.raiseError('accountCode missing');
  if(!options.signature) R.raiseError('signature missing');

  var billingInfo = R.BillingInfo.create();

  var $form = $(R.dom.update_billing_info_form);
  $form.find('.billing_info').html(R.dom.billing_info_fields);


  initCommonForm($form, options);
  initBillingInfoForm($form, options);


  $form.submit(function(e) {
    e.preventDefault(); 

    clearServerErrors($form);

    $form.find('.error').remove();
    $form.find('.invalid').removeClass('invalid');

    validationGroup(function(puller) {
      pullBillingInfoFields($form, billingInfo, options, puller);
    }
    , function() {
      $form.addClass('submitting');
      $form.find('button.submit').attr('disabled', true).text('Please Wait');

      billingInfo.save({
        signature: options.signature
      , distinguishContactFromBillingInfo: options.distinguishContactFromBillingInfo
      , accountCode: options.accountCode
      , success: function(response) {
          if(options.successHandler) {
            options.successHandler(R.getToken(response));
          }

          if(options.successURL) {
            var url = options.successURL;
            R.postResult(url, response, options);
          }
        }
      , error: function(errors) {
          if(!options.onError || !options.onError(errors)) {
            displayServerErrors($form, errors);
          }
        }
      , complete: function() {
          $form.removeClass('submitting');
          $form.find('button.submit').removeAttr('disabled').text('Update');
        }
      });
    });
  });

  if(options.beforeInject) {
    options.beforeInject($form.get(0));
  }

  $(function() {
    var $container = $(options.target);
    $container.html($form);

    if(options.afterInject) {
      options.afterInject($form.get(0));
    }
  });

};


function initTOSCheck($form, options) {

  if(options.termsOfServiceURL || options.privacyPolicyURL) {
    var $tos = $form.find('.accept_tos').html(R.dom.terms_of_service);

    // If only one, remove 'and' 
    if(!(options.termsOfServiceURL && options.privacyPolicyURL)) {
      $tos.find('span.and').remove();
    }

    // set href or remove tos_link
    if(options.termsOfServiceURL) {
      $tos.find('a.tos_link').attr('href', options.termsOfServiceURL);
    }
    else {
      $tos.find('a.tos_link').remove();
    }

    // set href or remove pp_link
    if(options.privacyPolicyURL) {
      $tos.find('a.pp_link').attr('href', options.privacyPolicyURL);
    }
    else {
      $tos.find('a.pp_link').remove();
    }

  }
  else {
    $form.find('.accept_tos').remove();
  }
  
}

R.buildTransactionForm = function(options) {
  var defaults = {
    addressRequirement: 'full'
  , distinguishContactFromBillingInfo: true
  , collectContactInfo: true
  };

  options = $.extend(createObject(R.settings), defaults, options);


  if(!options.collectContactInfo && !options.accountCode) {
    R.raiseError('collectContactInfo is false, but no accountCode provided');
  }

  if(!options.signature) R.raiseError('signature missing');


  var billingInfo = R.BillingInfo.create()
  ,   account = R.Account.create()
  ,   transaction = R.Transaction.create();


  transaction.account = account;
  transaction.billingInfo = billingInfo;
  transaction.currency = options.currency;
  transaction.cost = new R.Cost(options.amountInCents);

  var $form = $(R.dom.one_time_transaction_form);
  $form.find('.billing_info').html(R.dom.billing_info_fields);

  if(options.collectContactInfo) {
    $form.find('.contact_info').html(R.dom.contact_info_fields);
  }
  else {
    $form.find('.contact_info').remove();
  }


  initCommonForm($form, options);
  initContactInfoForm($form, options);
  initBillingInfoForm($form, options);
  initTOSCheck($form, options);

  $form.submit(function(e) {
    e.preventDefault(); 

    clearServerErrors($form);

    $form.find('.error').remove();
    $form.find('.invalid').removeClass('invalid');

    validationGroup(function(puller) {
      pullAccountFields($form, account, options, puller);
      pullBillingInfoFields($form, billingInfo, options, puller);
      verifyTOSChecked($form, puller);
    }
    , function() {
      $form.addClass('submitting');
      $form.find('button.submit').attr('disabled', true).text('Please Wait');

      transaction.save({
        signature: options.signature
      , accountCode: options.accountCode
      , success: function(response) {
          if(options.successHandler) {
            options.successHandler(R.getToken(response));
          }

          if(options.successURL) {
            var url = options.successURL;
            R.postResult(url, response, options);
          }
        }
      , error: function(errors) {
          if(!options.onError || !options.onError(errors)) {
            displayServerErrors($form, errors);
          }
        }
      , complete: function() {
          $form.removeClass('submitting');
          $form.find('button.submit').removeAttr('disabled').text('Pay');
        }
      });
    });
  });

  if(options.beforeInject) {
    options.beforeInject($form.get(0));
  }

  $(function() {
    var $container = $(options.target);
    $container.html($form);

    if(options.afterInject) {
      options.afterInject($form.get(0));
    }
  });

};


R.buildSubscriptionForm = function(options) {
  var defaults = {
    enableAddOns: true
  , enableCoupons: true
  , addressRequirement: 'full'
  , distinguishContactFromBillingInfo: false
  };

  options = $.extend(createObject(R.settings), defaults, options);

  if(!options.signature) R.raiseError('signature missing');

  var $form = $(R.dom.subscribe_form);
  $form.find('.contact_info').html(R.dom.contact_info_fields);
  $form.find('.billing_info').html(R.dom.billing_info_fields);


  if(options.planCode)
    R.Plan.get(options.planCode, options.currency, gotPlan);
  else if(options.plan) {
    // this should never be called
    // the api does not have it, nor does anywhere else in the program refer to it
    gotPlan(options.plan);    
  }

  initCommonForm($form, options);
  initContactInfoForm($form, options);
  initBillingInfoForm($form, options);
  initTOSCheck($form, options);

  function gotPlan(plan) {

    if(options.filterPlan)
      plan = options.filterPlan(plan) || plan; 


    var subscription = plan.createSubscription(),
        account = R.Account.create(),
        billingInfo = R.BillingInfo.create();

    subscription.account = account;
    subscription.billingInfo = billingInfo;

    if(options.filterSubscription)
      subscription = options.filterSubscription(subscription) || subscription; 

    // == EDITABLE PLAN QUANTITY
    if(!plan.displayQuantity) {
      $form.find('.plan .quantity').remove();
    }

    // == SETUP FEE
    if(plan.setupFee) {
      $form.find('.subscription').addClass('with_setup_fee');
      $form.find('.plan .setup_fee .cost').text('' + plan.setupFee);
    }
    else {
      $form.find('.plan .setup_fee').remove();
    }
    
    // == FREE TRIAL
    if(plan.trial) {
      $form.find('.subscription').addClass('with_trial');

      $form.find('.plan .free_trial').text('First ' + plan.trial + ' free');
    }
    else {
      $form.find('.plan .free_trial').remove();
    }
 

    // == UPDATE ALL UI TOTALS via subscription.calculateTotals() results
    function updateTotals() {
      var totals = subscription.calculateTotals();

      $form.find('.plan .recurring_cost .cost').text('' + totals.plan);
      $form.find('.due_now .cost').text('' + totals.stages.now);
      $form.find('.coupon .discount').text('' + (totals.coupon || ''));
      $form.find('.vat .cost').text('' + (totals.vat || ''));

      $form.find('.add_ons .add_on').each(function() {
        var addOn = $(this).data('add_on');
        if($(this).hasClass('selected')) {
          var cost = totals.addOns[addOn.code];
          $(this).find('.cost').text('+ '+cost);
        }
        else {
          $(this).find('.cost').text('+ '+addOn.cost);
        }
      });
    }

    $form.find('.plan .quantity input').bind('change keyup', function() {
      subscription.plan.quantity = parseInt($(this).val(), 10) || 1;
      updateTotals();
    });

    // == SUBSCRIPTION PLAN GENERAL
    $form.find('.plan .name').text(plan.name);
    $form.find('.plan .recurring_cost .cost').text(''+plan.cost);
    $form.find('.plan .recurring_cost .interval').text('every '+plan.interval);


    // == GENERATE ADD-ONS
    var $addOnsList = $form.find('.add_ons');
    if(options.enableAddOns) {
      var l = plan.addOns.length;
      if(l) {
        $addOnsList.removeClass('none').addClass('any');
        for(var i=0; i < l; ++i) {
          var addOn = plan.addOns[i];

          var classAttr = 'add_on add_on_'+ addOn.code + (i % 2 ? ' even' : ' odd');
          if(i == 0) classAttr += ' first';
          if(i == l-1) classAttr += ' last';

          var $addOn = $('<div class="'+classAttr+'">' +
          '<div class="name">'+addOn.name+'</div>' +
          '<div class="field quantity">' +
            '<div class="placeholder">Qty</div>' +
            '<input type="text">' +
          '</div>' +
          '<div class="cost"/>' +
          '</div>');
          if(!addOn.displayQuantity) {
            $addOn.find('.quantity').remove();
          }
          $addOn.data('add_on', addOn);
          $addOn.appendTo($addOnsList);
        }

        // Quantity Change
        $addOnsList.delegate('.add_ons .quantity input', 'change keyup', function(e) { 
          var $addOn = $(this).closest('.add_on');
          var addOn = $addOn.data('add_on');
          var newQty = parseInt($(this).val(),10) || 1;
          subscription.findAddOnByCode(addOn.code).quantity = newQty;
          updateTotals();
        });

        $addOnsList.bind('selectstart', function(e) {
          if($(e.target).is('.add_on')) {
            e.preventDefault();
          }
        });

        // Add-on click
        $addOnsList.delegate('.add_ons .add_on', 'click', function(e) {
          if($(e.target).closest('.quantity').length) return;

          var selected = !$(this).hasClass('selected');
          $(this).toggleClass('selected', selected);

          var addOn = $(this).data('add_on');

          if(selected) {
            // add
            var sa = subscription.redeemAddOn(addOn);
            var $qty = $(this).find('.quantity input');
            sa.quantity = parseInt($qty.val(),10) || 1;
            $qty.focus();
          }
          else {
            // remove
            subscription.removeAddOn(addOn.code);
          }

          updateTotals();
        });
      }
    }
    else {
      $addOnsList.remove();
    }
    
    // == COUPON REDEEMER
    var $coupon = $form.find('.coupon'); 
    var lastCode = null;

    function updateCoupon() {

      var code = $coupon.find('input').val();
      if(code == lastCode) {
        return;
      }

      lastCode = code;

      if(!code) {
        $coupon.removeClass('invalid').removeClass('valid');
        $coupon.find('.description').text('');
        subscription.coupon = undefined;
        updateTotals();
        return;
      }

      $coupon.addClass('checking');
      subscription.getCoupon(code, function(coupon) {

        $coupon.removeClass('checking');

        subscription.coupon = coupon;
        $coupon.removeClass('invalid').addClass('valid');
        $coupon.find('.description').text(coupon.description);

        updateTotals();
      }, function() {

        subscription.coupon = undefined;

        $coupon.removeClass('checking');
        $coupon.removeClass('valid').addClass('invalid');
        $coupon.find('.description').text(R.locale.errors.invalidCoupon);

        updateTotals();
      });
    }

    if(options.enableCoupons) {
      $coupon.find('input').bind('keyup change', function(e) {
      });

      $coupon.find('input').keypress(function(e) {
        if(e.charCode == 13) {
          e.preventDefault();
          updateCoupon();
        }
      });


      $coupon.find('.check').click(function() {
        updateCoupon();
      });

      $coupon.find('input').blur(function() { $coupon.find('.check').click(); });
    }
    else {
      $coupon.remove();
    }


    // == VAT
    var $vat = $form.find('.vat'); 
    var $vatNumber = $form.find('.vat_number');
    var $vatNumberInput = $vatNumber.find('input');

    $vat.find('.title').text('VAT at ' + R.settings.VATPercent + '%');
    function showHideVAT() { 
      var buyerCountry = $form.find('.country select').val();
      var vatNumberApplicable = R.isVATNumberApplicable(buyerCountry);

      // VAT Number is applicable to collection in any EU country
      $vatNumber.toggleClass('applicable', vatNumberApplicable);
      $vatNumber.toggleClass('inapplicable', !vatNumberApplicable);

      var vatNumber = $vatNumberInput.val();

      // Only applicable to charge if isVATApplicable()
      var chargeApplicable = R.isVATChargeApplicable(buyerCountry, vatNumber);
      $vat.toggleClass('applicable', chargeApplicable);
      $vat.toggleClass('inapplicable', !chargeApplicable);
    }
    // showHideVAT();
    $form.find('.country select').change(function() {
      billingInfo.country = $(this).val();
      updateTotals();
      showHideVAT();
    }).change();
    $vatNumberInput.bind('keyup change', function() {
      billingInfo.vatNumber = $(this).val();
      updateTotals();
      showHideVAT();
    });
 
    // SUBMIT HANDLER
    $form.submit(function(e) {
      e.preventDefault(); 

      clearServerErrors($form);

      
      $form.find('.error').remove();
      $form.find('.invalid').removeClass('invalid');

      validationGroup(function(puller) {
        pullPlanQuantity($form, subscription.plan, options, puller);
        pullAccountFields($form, account, options, puller);
        pullBillingInfoFields($form, billingInfo, options, puller);
        verifyTOSChecked($form, puller);
      }, function() {

        $form.addClass('submitting');
        $form.find('button.submit').attr('disabled', true).text('Please Wait');

        subscription.save({

        signature: options.signature
        ,   success: function(response) {
              if(options.successHandler) {
                options.successHandler(R.getToken(response));
              }
              if(options.successURL) {
                var url = options.successURL;
                R.postResult(url, response, options);
              }
            }
        , error: function(errors) {
            if(!options.onError || !options.onError(errors)) {
              displayServerErrors($form, errors);
            }
          }
        , complete: function() {
            $form.removeClass('submitting');
            $form.find('button.submit').removeAttr('disabled').text('Subscribe');
          }
        });
      });

    });

    // FINALLY - UPDATE INITIAL TOTALS AND INJECT INTO DOM
    updateTotals();

    if(options.beforeInject) {
      options.beforeInject($form.get(0));
    }

    $(function() {
      var $container = $(options.target);
      $container.html($form);

      if(options.afterInject) {
        options.afterInject($form.get(0));
      }
    });

  }

};



//////////////////////////////////////////////////
// Compiled from src/js/states.js
//////////////////////////////////////////////////

R.states = {};
R.states.US = {
  "-": "Select State"
, "--": "------------"
, "AK": "Alaska"
, "AL": "Alabama"
, "AP": "Armed Forces Pacific"
, "AR": "Arkansas"
, "AS": "American Samoa"
, "AZ": "Arizona"
, "CA": "California"
, "CO": "Colorado"
, "CT": "Connecticut"
, "DC": "District of Columbia"
, "DE": "Delaware"
, "FL": "Florida"
, "FM": "Federated States of Micronesia"
, "GA": "Georgia"
, "GU": "Guam"
, "HI": "Hawaii"
, "IA": "Iowa"
, "ID": "Idaho"
, "IL": "Illinois"
, "IN": "Indiana"
, "KS": "Kansas"
, "KY": "Kentucky"
, "LA": "Louisiana"
, "MA": "Massachusetts"
, "MD": "Maryland"
, "ME": "Maine"
, "MH": "Marshall Islands"
, "MI": "Michigan"
, "MN": "Minnesota"
, "MO": "Missouri"
, "MP": "Northern Mariana Islands"
, "MS": "Mississippi"
, "MT": "Montana"
, "NC": "North Carolina"
, "ND": "North Dakota"
, "NE": "Nebraska"
, "NH": "New Hampshire"
, "NJ": "New Jersey"
, "NM": "New Mexico"
, "NV": "Nevada"
, "NY": "New York"
, "OH": "Ohio"
, "OK": "Oklahoma"
, "OR": "Oregon"
, "PA": "Pennsylvania"
, "PR": "Puerto Rico"
, "PW": "Palau"
, "RI": "Rhode Island"
, "SC": "South Carolina"
, "SD": "South Dakota"
, "TN": "Tennessee"
, "TX": "Texas"
, "UT": "Utah"
, "VA": "Virginia"
, "VI": "Virgin Islands"
, "VT": "Vermont"
, "WA": "Washington"
, "WV": "West Virginia"
, "WI": "Wisconsin"
, "WY": "Wyoming"
};

R.states.CA = {
  "-": "Select State"
, "--": "------------"
, "AB": "Alberta"
, "BC": "British Columbia"
, "MB": "Manitoba"
, "NB": "New Brunswick"
, "NL": "Newfoundland"
, "NS": "Nova Scotia"
, "NU": "Nunavut"
, "ON": "Ontario"
, "PE": "Prince Edward Island"
, "QC": "Quebec"
, "SK": "Saskatchewan"
, "NT": "Northwest Territories"
, "YT": "Yukon Territory"
, "AA": "Armed Forces Americas"
, "AE": "Armed Forces Europe, Middle East, &amp; Canada"
};




//////////////////////////////////////////////////
// Compiled from src/dom/contact_info_fields.jade
//////////////////////////////////////////////////

R.dom['contact_info_fields'] = '<div class="title">Contact Info</div><div class="full_name"><div class="field first_name"><div class="placeholder">First Name </div><input type="text"/></div><div class="field last_name"><div class="placeholder">Last Name </div><input type="text"/></div></div><div class="field email"><div class="placeholder">Email </div><input type="text"/></div><div class="field phone"><div class="placeholder">Phone Number</div><input type="text"/></div><div class="field company_name"><div class="placeholder">Company/Organization Name</div><input type="text"/></div>';

//////////////////////////////////////////////////
// Compiled from src/dom/billing_info_fields.jade
//////////////////////////////////////////////////

R.dom['billing_info_fields'] = '<div class="title">Billing Info</div><div class="accepted_cards"></div><div class="credit_card"><div class="field first_name"><div class="placeholder">First Name </div><input type="text"/></div><div class="field last_name"><div class="placeholder">Last Name </div><input type="text"/></div><div class="card_cvv"><div class="field card_number"><div class="placeholder">Credit Card Number  </div><input type="text"/></div><div class="field cvv"><div class="placeholder">CVV </div><input type="text"/></div></div><div class="field expires"><div class="title">Expires </div><div class="month"><select><option value="1">01 - January</option><option value="2">02 - February</option><option value="3">03 - March</option><option value="4">04 - April</option><option value="5">05 - May</option><option value="6">06 - June</option><option value="7">07 - July</option><option value="8">08 - August</option><option value="9">09 - September</option><option value="10">10 - October</option><option value="11">11 - November</option><option value="12">12 - December</option></select></div><div class="year"><select></select></div></div></div><div class="address"><div class="field address1"><div class="placeholder">Address</div><input type="text"/></div><div class="field address2"><div class="placeholder">Apt/Suite</div><input type="text"/></div><div class="field city"><div class="placeholder">City</div><input type="text"/></div><div class="state_zip"><div class="field state"><div class="placeholder">State/Province</div><input type="text"/></div><div class="field zip"><div class="placeholder">Zip/Postal</div><input type="text"/></div></div><div class="field country"><select><option value="-">Select Country</option><option value="-">--------------</option><option value="AF">Afghanistan</option><option value="AL">Albania</option><option value="DZ">Algeria</option><option value="AS">American Samoa</option><option value="AD">Andorra</option><option value="AO">Angola</option><option value="AI">Anguilla</option><option value="AQ">Antarctica</option><option value="AG">Antigua and Barbuda</option><option value="AR">Argentina</option><option value="AM">Armenia</option><option value="AW">Aruba</option><option value="AC">Ascension Island</option><option value="AU">Australia</option><option value="AT">Austria</option><option value="AZ">Azerbaijan</option><option value="BS">Bahamas</option><option value="BH">Bahrain</option><option value="BD">Bangladesh</option><option value="BB">Barbados</option><option value="BE">Belgium</option><option value="BZ">Belize</option><option value="BJ">Benin</option><option value="BM">Bermuda</option><option value="BT">Bhutan</option><option value="BO">Bolivia</option><option value="BA">Bosnia and Herzegovina</option><option value="BW">Botswana</option><option value="BV">Bouvet Island</option><option value="BR">Brazil</option><option value="BQ">British Antarctic Territory</option><option value="IO">British Indian Ocean Territory</option><option value="VG">British Virgin Islands</option><option value="BN">Brunei</option><option value="BG">Bulgaria</option><option value="BF">Burkina Faso</option><option value="BI">Burundi</option><option value="KH">Cambodia</option><option value="CM">Cameroon</option><option value="CA">Canada</option><option value="IC">Canary Islands</option><option value="CT">Canton and Enderbury Islands</option><option value="CV">Cape Verde</option><option value="KY">Cayman Islands</option><option value="CF">Central African Republic</option><option value="EA">Ceuta and Melilla</option><option value="TD">Chad</option><option value="CL">Chile</option><option value="CN">China</option><option value="CX">Christmas Island</option><option value="CP">Clipperton Island</option><option value="CC">Cocos [Keeling] Islands</option><option value="CO">Colombia</option><option value="KM">Comoros</option><option value="CD">Congo [DRC]</option><option value="CK">Cook Islands</option><option value="CR">Costa Rica</option><option value="HR">Croatia</option><option value="CU">Cuba</option><option value="CY">Cyprus</option><option value="CZ">Czech Republic</option><option value="DK">Denmark</option><option value="DG">Diego Garcia</option><option value="DJ">Djibouti</option><option value="DM">Dominica</option><option value="DO">Dominican Republic</option><option value="NQ">Dronning Maud Land</option><option value="DD">East Germany</option><option value="TL">East Timor</option><option value="EC">Ecuador</option><option value="EG">Egypt</option><option value="SV">El Salvador</option><option value="EE">Estonia</option><option value="ET">Ethiopia</option><option value="EU">European Union</option><option value="FK">Falkland Islands [Islas Malvinas]</option><option value="FO">Faroe Islands</option><option value="FJ">Fiji</option><option value="FI">Finland</option><option value="FR">France</option><option value="GF">French Guiana</option><option value="PF">French Polynesia</option><option value="TF">French Southern Territories</option><option value="FQ">French Southern and Antarctic Territories</option><option value="GA">Gabon</option><option value="GM">Gambia</option><option value="GE">Georgia</option><option value="DE">Germany</option><option value="GH">Ghana</option><option value="GI">Gibraltar</option><option value="GR">Greece</option><option value="GL">Greenland</option><option value="GD">Grenada</option><option value="GP">Guadeloupe</option><option value="GU">Guam</option><option value="GT">Guatemala</option><option value="GG">Guernsey</option><option value="GW">Guinea-Bissau</option><option value="GY">Guyana</option><option value="HT">Haiti</option><option value="HM">Heard Island and McDonald Islands</option><option value="HN">Honduras</option><option value="HK">Hong Kong</option><option value="HU">Hungary</option><option value="IS">Iceland</option><option value="IN">India</option><option value="ID">Indonesia</option><option value="IE">Ireland</option><option value="IM">Isle of Man</option><option value="IL">Israel</option><option value="IT">Italy</option><option value="JM">Jamaica</option><option value="JP">Japan</option><option value="JE">Jersey</option><option value="JT">Johnston Island</option><option value="JO">Jordan</option><option value="KZ">Kazakhstan</option><option value="KE">Kenya</option><option value="KI">Kiribati</option><option value="KW">Kuwait</option><option value="KG">Kyrgyzstan</option><option value="LA">Laos</option><option value="LV">Latvia</option><option value="LS">Lesotho</option><option value="LY">Libya</option><option value="LI">Liechtenstein</option><option value="LT">Lithuania</option><option value="LU">Luxembourg</option><option value="MO">Macau</option><option value="MK">Macedonia [FYROM]</option><option value="MG">Madagascar</option><option value="MW">Malawi</option><option value="MY">Malaysia</option><option value="MV">Maldives</option><option value="ML">Mali</option><option value="MT">Malta</option><option value="MH">Marshall Islands</option><option value="MQ">Martinique</option><option value="MR">Mauritania</option><option value="MU">Mauritius</option><option value="YT">Mayotte</option><option value="FX">Metropolitan France</option><option value="MX">Mexico</option><option value="FM">Micronesia</option><option value="MI">Midway Islands</option><option value="MD">Moldova</option><option value="MC">Monaco</option><option value="MN">Mongolia</option><option value="ME">Montenegro</option><option value="MS">Montserrat</option><option value="MA">Morocco</option><option value="MZ">Mozambique</option><option value="NA">Namibia</option><option value="NR">Nauru</option><option value="NP">Nepal</option><option value="NL">Netherlands</option><option value="AN">Netherlands Antilles</option><option value="NT">Neutral Zone</option><option value="NC">New Caledonia</option><option value="NZ">New Zealand</option><option value="NI">Nicaragua</option><option value="NE">Niger</option><option value="NG">Nigeria</option><option value="NU">Niue</option><option value="NF">Norfolk Island</option><option value="VD">North Vietnam</option><option value="MP">Northern Mariana Islands</option><option value="NO">Norway</option><option value="OM">Oman</option><option value="QO">Outlying Oceania</option><option value="PC">Pacific Islands Trust Territory</option><option value="PK">Pakistan</option><option value="PW">Palau</option><option value="PS">Palestinian Territories</option><option value="PA">Panama</option><option value="PZ">Panama Canal Zone</option><option value="PY">Paraguay</option><option value="YD">People\'s Democratic Republic of Yemen</option><option value="PE">Peru</option><option value="PH">Philippines</option><option value="PN">Pitcairn Islands</option><option value="PL">Poland</option><option value="PT">Portugal</option><option value="PR">Puerto Rico</option><option value="QA">Qatar</option><option value="RO">Romania</option><option value="RU">Russia</option><option value="RW">Rwanda</option><option value="RE">R\u00e9union</option><option value="BL">Saint Barth\u00e9lemy</option><option value="SH">Saint Helena</option><option value="KN">Saint Kitts and Nevis</option><option value="LC">Saint Lucia</option><option value="MF">Saint Martin</option><option value="PM">Saint Pierre and Miquelon</option><option value="VC">Saint Vincent and the Grenadines</option><option value="WS">Samoa</option><option value="SM">San Marino</option><option value="SA">Saudi Arabia</option><option value="SN">Senegal</option><option value="RS">Serbia</option><option value="CS">Serbia and Montenegro</option><option value="SC">Seychelles</option><option value="SL">Sierra Leone</option><option value="SG">Singapore</option><option value="SK">Slovakia</option><option value="SI">Slovenia</option><option value="SB">Solomon Islands</option><option value="ZA">South Africa</option><option value="GS">South Georgia and the South Sandwich Islands</option><option value="KR">South Korea</option><option value="ES">Spain</option><option value="LK">Sri Lanka</option><option value="SR">Suriname</option><option value="SJ">Svalbard and Jan Mayen</option><option value="SZ">Swaziland</option><option value="SE">Sweden</option><option value="CH">Switzerland</option><option value="ST">S\u00e3o Tom\u00e9 and Pr\u00edncipe</option><option value="TW">Taiwan</option><option value="TJ">Tajikistan</option><option value="TZ">Tanzania</option><option value="TH">Thailand</option><option value="TG">Togo</option><option value="TK">Tokelau</option><option value="TO">Tonga</option><option value="TT">Trinidad and Tobago</option><option value="TA">Tristan da Cunha</option><option value="TN">Tunisia</option><option value="TR">Turkey</option><option value="TM">Turkmenistan</option><option value="TC">Turks and Caicos Islands</option><option value="TV">Tuvalu</option><option value="UM">U.S. Minor Outlying Islands</option><option value="PU">U.S. Miscellaneous Pacific Islands</option><option value="VI">U.S. Virgin Islands</option><option value="UG">Uganda</option><option value="UA">Ukraine</option><option value="AE">United Arab Emirates</option><option value="GB">United Kingdom</option><option value="US">United States</option><option value="UY">Uruguay</option><option value="UZ">Uzbekistan</option><option value="VU">Vanuatu</option><option value="VA">Vatican City</option><option value="VE">Venezuela</option><option value="VN">Vietnam</option><option value="WK">Wake Island</option><option value="WF">Wallis and Futuna</option><option value="EH">Western Sahara</option><option value="YE">Yemen</option><option value="ZM">Zambia</option><option value="AX">\u00c5land Islands</option></select></div></div><div class="field vat_number"><div class="placeholder">VAT Number</div><input type="text"/></div>';

//////////////////////////////////////////////////
// Compiled from src/dom/subscribe_form.jade
//////////////////////////////////////////////////

R.dom['subscribe_form'] = '<form class="recurly subscribe"><!--[if lt IE 7]><div class="iefail"><div class="chromeframe"><p class="blast">Your browser is not supported by Recurly.js.</p><p><a href="http://browsehappy.com/">Upgrade to a different browser</a></p><p>or</p><p><a href="http://www.google.com/chromeframe/?redirect=true">install Google Chrome Frame</a></p><p>to use this site.</p></div></div><![endif]--><div class="subscription"><div class="plan"><div class="name"></div><div class="field quantity"><div class="placeholder">Qty</div><input type="text"/></div><div class="recurring_cost"><div class="cost"></div><div class="interval"></div></div><div class="free_trial"></div><div class="setup_fee"><div class="title">Setup Fee</div><div class="cost"></div></div></div><div class="add_ons none"></div><div class="coupon"><div class="coupon_code field"><div class="placeholder">Coupon Code</div><input type="text" class="coupon_code"/></div><div class="check"></div><div class="description"></div><div class="discount"></div></div><div class="vat"><div class="title">VAT</div><div class="cost"></div></div></div><div class="due_now"><div class="title">Order Total</div><div class="cost"></div></div><div class="server_errors none"></div><div class="contact_info"></div><div class="billing_info"></div><div class="accept_tos"></div><div class="footer"><button type="submit" class="submit">Subscribe</button></div></form>';

//////////////////////////////////////////////////
// Compiled from src/dom/update_billing_info_form.jade
//////////////////////////////////////////////////

R.dom['update_billing_info_form'] = '<form class="recurly update_billing_info"><div class="server_errors none"></div><div class="billing_info"></div><div class="footer"><button type="submit" class="submit">Update</button></div></form>';

//////////////////////////////////////////////////
// Compiled from src/dom/one_time_transaction_form.jade
//////////////////////////////////////////////////

R.dom['one_time_transaction_form'] = '<form class="recurly update_billing_info"><div class="server_errors none"></div><div class="contact_info"></div><div class="billing_info"></div><div class="accept_tos"></div><div class="footer"><button type="submit" class="submit">Pay</button></div></form>';

//////////////////////////////////////////////////
// Compiled from src/dom/terms_of_service.jade
//////////////////////////////////////////////////

R.dom['terms_of_service'] = '<input id="tos_check" type="checkbox"/><label id="accept_tos" for="tos_check">I accept the <a target="_blank" class="tos_link">Terms of Service</a><span class="and"> and </span><a target="_blank" class="pp_link">Privacy Policy</a></label>';
window.Recurly = R;
})(jQuery);