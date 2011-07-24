(function($){

"use strict";

// Object.create polyfill; true prototypal programming
if (typeof Object.create !== 'function') {
 Object.create = function(o, props) {
  function F() {}
  F.prototype = o;

  if (typeof(props) === "object") {
   for (prop in props) {
    if (props.hasOwnProperty((prop))) {
     F[prop] = props[prop];
    }
   }
  }
  return new F();
 };
}

// Array.map
if (!Array.prototype.map)
{
  Array.prototype.map = function(fun /*, thisp */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    var res = new Array(len);
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in t)
        res[i] = fun.call(thisp, t[i], i, t);
    }

    return res;
  };
}

// Array.forEach
if (!Array.prototype.forEach) {

  Array.prototype.forEach = function( callbackfn, thisArg ) {

    var T,
      O = Object(this),
      len = O.length >>> 0,
      k = 0;

    if ( !callbackfn || !callbackfn.call ) {
      throw new TypeError();
    }

    if ( thisArg ) {
      T = thisArg;
    }

    while( k < len ) {

      var Pk = String( k ),
        kPresent = O.hasOwnProperty( Pk ),
        kValue;

      if ( kPresent ) {
        kValue = O[ Pk ];

        callbackfn.call( T, kValue, k, O );
      }

      k++;
    }
  };
}


var R = {}; 

R.settings = {};

function pluralize(count, term) {
  if(count == 1) {
    return term.substr(0,term.length-1);
  }

  return '' + count + ' ' + term;
}

R.config = function(settings) { 
  $.extend(true, R.settings, settings); 

  if(!settings.baseURL) {

    switch(R.settings.environment) {
      case 'sandbox':
        R.settings.baseURL = 'https://api-sandbox.recurly.com/jsonp/'; 
        break;

      case 'production':
        R.settings.baseURL = 'https://api-production.recurly.com/jsonp/'; 
        break;

      case 'development':
        R.settings.baseURL = 'http://api-sandbox.recurly.com/jsonp/'; 
        break;

      default:
        R.raiseError('environment not configured (sandbox or production)');
        break;
    }

    var subdomain = R.settings.subdomain || R.raiseError('company subdomain not configured');
    R.settings.baseURL += subdomain + '/';
  }
};


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

    return new R.Cost(val/100);
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



R.locale = {};

R.locale.errors = {
  emptyField: 'Forget something?'
, missingFullAddress: 'Please enter your full address.'
, invalidEmail: 'This doesn\'t look right.'
, invalidCC: 'This doesn\'t look right.'
, invalidCVV: 'This doesn\'t look right.'
, invalidCoupon: 'Coupon not found' 
, cardDeclined: 'Sorry, your card was declined.' 
};

R.locale.currencies = {};

R.locale.currency = {
  format: "%u%n"
, separator: "."
, delimiter: ","
, precision: 2
};

function C(key, def) {
  var c = R.locale.currencies[key] = Object.create(R.locale.currency);
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
  symbol: '\u6b72'
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




// Credit card type functions
R.detectCardType = function(cardnumber) {

  cardnumber = cardnumber.replace(/\D/g, '');

  var cards = [
    { name: 'visa', prefixes: [4] },
    { name: 'mastercard', prefixes: [51, 52, 53, 54, 55] },
    { name: 'american_express', prefixes: [34, 37] },
    { name: 'discover', prefixes: [6011, 62, 64, 65] },
    { name: 'diners_club', prefixes: [305, 36, 38] },
    { name: 'carte_blanche', prefixes: [300, 301, 302, 303, 304, 305] },
    { name: 'jcb', prefixes: [35] },
    { name: 'enroute', prefixes: [2014, 2149] },
    { name: 'solo', prefixes: [6334, 6767] },
    { name: 'switch', prefixes: [4903, 4905, 4911, 4936, 564182, 633110, 6333, 6759] },
    { name: 'maestro', prefixes: [5018, 5020, 5038, 6304, 6759, 6761] },
    { name: 'visa', prefixes: [417500, 4917, 4913, 4508, 4844] }, // visa electron
    { name: 'laser', prefixes: [6304, 6706, 6771, 6709] }
  ];

  for (var c = 0; c < cards.length; c++) {
    for (var p = 0; p < cards[c].prefixes.length; p++) {
      if (new RegExp('^' + cards[c].prefixes[p].toString()).test(cardnumber))
        return cards[c].name;
    }
  }

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

R.isVATApplicable = function(buyerCountry) {
  if(!R.settings.VATPercent) return false;

  if(!R.settings.country) {
    R.raiseError('you must configure a country for VAT to work');
  }

  var sellerCountry = R.settings.country;
  var inEU = $.inArray(buyerCountry, euCountries) !== -1;
  return inEU && (sellerCountry != buyerCountry);
};




(R.isValidCC = function(value) {
  // accept only digits and dashes
  if (/[^0-9-]+/.test(value))
    return false;

  var nCheck = 0,
      nDigit = 0,
      bEven = false;

  value = value.replace(/\D/g, "");

  for (var n = value.length - 1; n >= 0; n--) {
    var cDigit = value.charAt(n);
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

(R.isValidEmail = function(v) {
  return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(v);
}).defaultErrorKey = 'invalidEmail';

function wholeNumber(val) {
  return /^[0-9]+$/.test(val);
}

(R.isValidCVV = function(v) {
  return (v.length == 3 || v.length == 4) && wholeNumber(v);
}).defaultErrorKey = 'invalidCVV';

(R.isNotEmpty = function(v) {
  return !!v;
}).defaultErrorKey = 'emptyField';



//
/////////// PLANS //////////
//
//
//


R.Plan = {
  fromJSON: function(json) {
    var p = Object.create(R.Plan);

    p.name = json.name;
    p.code = json.plan_code;
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

    p.addOns = [];
    if(json.add_ons) {
      for(var l=json.add_ons.length, i=0; i < l; ++i) {
        var a = json.add_ons[i];
        p.addOns.push(R.AddOn.fromJSON(a));
      }
    }

    return p;
  }
};

R.Error = {
  toString: function() {
    return 'RecurlyJS Error: ' + this.message;
  }
};

R.raiseError = function(message) {
  var e = Object.create(R.Error);
  e.message = message;
  throw e;
};

R.getPlan = function(plan_code, callback) {

  // if(!R.settings.site) { throw 'Company subdomain not configured'; }


  $.ajax({
    url: R.settings.baseURL+'plans/'+plan_code,
    // data: params,
    dataType: "jsonp",
    jsonp: "callback",
    success: function(data) {
      var plan = R.Plan.fromJSON(data);
      callback(plan);
    }
  });
};


R.AddOn = {
  fromJSON: function(json) {
    var a = Object.create(R.AddOn);
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

  // this.name = json.name;
  // this.code = json.add_on_code;
};




 
(R.Account = function(raw) {
  if(raw === undefined) return;

}).prototype = {
  fromAddOn: function(a) {
    this.code = a.code;
    this.name = a.name;
    this.cost = a.cost;
    this.quantity = 1;
  }
};



//
/////////// SUBSCRIPTIONS //////////
//
//
//

R.Account = {
  toJSON: function() {    
    return {
      first_name: this.firstName
    , last_name: this.lastName
    , account_code: this.code
    , email: this.email
    };
  }
, validate: function() { 
    validateNotEmpty.call(this, 'firstName');
  }
};

R.BillingInfo = {
  toJSON: function() {    
    return {
      month: this.expires.getMonth()
    , year: this.expires.getFullYear()
    , number: this.number
    , verification_value: this.cvv
    , address1: this.address1
    , address2: this.address2
    , city: this.city
    , state: this.state
    , zip: this.zip
    , country: this.country
    };
  }
};


R.makeAccount = function() {
  return Object.create(R.Account);
};

R.makeBillingInfo = function() {
  return Object.create(R.BillingInfo);
};



R.Plan.makeSubscription = function() {
  var s = Object.create(R.Subscription);
  s.plan = Object.create(this);
  s.plan.quantity = 1;
  return s;
};


// Base Subscription prototype
R.Subscription = {
  plan: R.Plan,
  addOns: [],

  calculateTotals: function() {
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

    // SETUP FEE
    if(this.plan.setupFee) {
      totals.stages.now = totals.stages.now.add(this.plan.setupFee);
    }



    // COUPON
    if(this.coupon) {
      var beforeDiscount = totals.stages.now;
      var afterDiscount = totals.stages.now.discount(this.coupon);
      totals.coupon = afterDiscount.sub(beforeDiscount);
      totals.stages.now = afterDiscount;
    }

    // VAT
    if(this.billingInfo && R.isVATApplicable(this.billingInfo.country) && !this.billingInfo.vatNumber) {
      totals.vat = totals.stages.now.mult( (R.settings.VATPercent/100) );
      totals.stages.now = totals.stages.now.sub(totals.vat);
    }


    return totals;
  }
, redeemAddOn: function(addOn) {
  var redemption = addOn.makeRedemption();
  this.addOns.push(redemption); 
  return redemption;
}

, removeAddOn: function(code) {
  for(var l=this.addOns.length, i=0; i < l; ++i) {
    if(this.addOns[i].code == code) {
      this.addOns.splice(i,1);
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
    , coupon_code: this.coupon ? this.coupon.code : undefined
    , add_ons: this.addOns.map(function(a) {
        return {
          add_on_code: a.code
        , quantity: a.quantity
        };
      })
    };

    return json;
  }
};

R.AddOn.makeRedemption = function(qty) {
  var r = Object.create(this);
  r.quantity = qty || 1;
  return r;
};

R.Coupon = {
  fromJSON: function(json) {
    var c = Object.create(R.Coupon);

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

  return $.ajax({
    url: R.settings.baseURL+'plans/'+this.plan.code+'/coupons/'+couponCode,
    // data: params,
    dataType: "jsonp",
    jsonp: "callback",
    success: function(data) {
      var coupon = R.Coupon.fromJSON(data);
      coupon.code = couponCode;
      if(data.valid) {
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

R.flattenErrors = function(obj, attr) {
  var arr = [];

  var baseErrorKeys = ['base','account_id'];

  var attr = attr || '';

  if(  typeof obj == 'string'
    || typeof obj == 'number'
    || typeof obj == 'boolean') {
    
    if($.inArray(baseErrorKeys, attr)) {
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
}

R.Subscription.save = function(successCallback,errorCallback) {
  var json = {
    subscription: this.toJSON()
  , account: this.account.toJSON()
  , billing_info: this.billingInfo.toJSON()
  };

  $.ajax({
    url: R.settings.baseURL+'subscribe',
    data: json,
    dataType: "jsonp",
    jsonp: "callback",
    success: function(data) {
      if(data.success) {
        successCallback(data.success);
      }
      else if(data.errors) {
        errorCallback( R.flattenErrors(data.errors) );
      }
    },
    error: function() {
      errorCallback(['Unknown error processing transaction. Please try again later.']);
    }
  });

};


//
/////////// GENERATION //////////
//
//


R.UserError = {};

function raiseUserError(validation, elem) {
  var e = Object.create(R.UserError);
  e.validation = validation;
  e.element = elem;
  throw e;
}

function handleUserErrors(block) {
  try {
    block();
  }
  catch(e) {
    if(!e.validation)
      throw e;

    var $input = e.element;
    var message = R.locale.errors[e.validation.errorKey];
    var validator = e.validation.validator;

    var $e = $('<div class="error">');
    $e.text(message);
    $e.insertAfter($input);

    $input.addClass('invalid');
    $input.bind('change keyup', function() { 
      var val = $input.val();

      if(validator(val)) {
        $input.removeClass('invalid');
        $e.remove();
        $input.unbind();
      }
    });

    $input.focus();
  }
}

function getField($form, li, validation) {
  // Try text input
  var $input = $form.find('.' + li + ' input');
  // Try as select
  if($input.length == 0) {
    $input = $form.find('.' + li + ' select');
  }

  // Treat nonexistence as removed deliberately
  if($input.length == 0) return undefined;

  var val = $input.val();

  for(var i=2,v; v=arguments[i]; ++i) {

    if(!v.validator(val)) {
      raiseUserError(v, $input);
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


function initCommonForm($form, options) {

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

  // Touch of perfection
  $form.delegate('input', 'keydown', function(e) {
    if(e.keyCode >= 48 && e.keyCode <= 90) {
      $(this).parent().find('.placeholder').hide();
    }
  });
  
}

function initBillingInfoForm($form, options) {
  // == DEFAULT BUYER TO SELLER COUNTRY
  if(R.settings.country) {
    var $countryOpt = $form.find('.country option[value='+R.settings.country+']');
    if($countryOpt.length) {
      $countryOpt.attr('selected', true).change();
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

  // == DISABLE INVALID MONTHS, SELECT CURRENT
  function updateMonths() {
    if($yearSelect.val() == year) {
      $monthSelect.find('option[value="'+month+'"]')
      var foundSelected = false;
      $monthSelect.find('option').each(function(){
        if($(this).val() <= month) {
          $(this).attr('disabled', true);
        }
        else {
          $(this).removeAttr('disabled');
          if(!foundSelected) {
            foundSelected = true;
            $(this).attr('selected', true);
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

  // == SHOW/HIDE CARD TYPES
  var $acceptedCards = $form.find('.accepted_cards');
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

R.buildAccountUpdateForm = function(options) {
  var defaults = {
    addressRequirement: 'full'
  };

  options = $.extend({}, defaults, options);

  var $container = $(options.target);
  var $form = $(R.accountUpdateFormHTML);
  $form.find('.billing_info').html(R.billingInfoFieldsHTML);


  initCommonForm($form, options);
  initBillingInfoForm($form, options);

  $container.html($form);
};

R.buildSubscribeForm = function(options) {
  var defaults = {
    enableAddOns: true,
    enableCoupons: true,
    addressRequirement: 'full'
  };

  options = $.extend({}, defaults, options);

  var $container = $(options.target);
  var $form = $(R.subscribeFormHTML);
  $form.find('.billing_info').html(R.billingInfoFieldsHTML);


  initCommonForm($form, options);

  R.getPlan(options.plan, function(plan) {
    var subscription = plan.makeSubscription(),
        account = R.makeAccount(),
        billingInfo = R.makeBillingInfo();

    subscription.account = account;
    subscription.billingInfo = billingInfo;


    initBillingInfoForm($form, options, billingInfo);

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

          var $addOn = $('<div class="add_on add_on_'+ addOn.code + ' ' + (i % 2 ? 'even' : 'odd') +'">' +
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
          if(!$(e.target).is('.name') && !$(e.target).is('.cost')) {
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

    function makeChangeValidator(originalVal) {
      return function(val) {
        return !!originalVal != val;
      }
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
        $coupon.find('.description').text('Not Found');

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

    $vat.find('label').text('VAT at ' + R.settings.VATPercent + '%');
    function showHideVAT() { 
      var buyerCountry = $form.find('.country select').val();
      var applicable = R.isVATApplicable(buyerCountry); 
      var vatNumber = $vatNumberInput.val();

      $vatNumber.toggleClass('applicable', applicable);
      $vatNumber.toggleClass('inapplicable', !applicable);

      applicable = applicable && !vatNumber;
      $vat.toggleClass('applicable', applicable);
      $vat.toggleClass('inapplicable', !applicable);
    }
    showHideVAT();
    $form.find('.country select').change(function() {
      billingInfo.country = $(this).val();
      updateTotals();
      showHideVAT();
    });
    $vatNumberInput.bind('keyup change', function() {
      billingInfo.vatNumber = $(this).val();
      updateTotals();
      showHideVAT();
    });



    //
    // Pulls user input into model objects
    function syncUserInput() {
      // The copying

      account.firstName = getField($form, 'first_name', V(R.isNotEmpty)); 
      account.lastName = getField($form, 'last_name', V(R.isNotEmpty)); 
      account.email = getField($form, 'email', V(R.isNotEmpty), V(R.isValidEmail)); 
      account.code = options.accountCode || account.email;

      billingInfo.number = getField($form, 'card_number', V(R.isNotEmpty), V(R.isValidCC)); 
      billingInfo.cvv = getField($form, 'cvv', V(R.isNotEmpty), V(R.isValidCVV)); 

      var exp = new Date(0); 
      exp.setMonth( getField($form, 'month') );
      exp.setFullYear( getField($form, 'year') );
      billingInfo.expires = exp;

      billingInfo.address1 = getField($form, 'address1', V(R.isNotEmpty)); 
      billingInfo.address2 = getField($form, 'address2', V(R.isNotEmpty)); 
      billingInfo.city = getField($form, 'city', V(R.isNotEmpty)); 
      billingInfo.state = getField($form, 'state', V(R.isNotEmpty)); 
      billingInfo.zip = getField($form, 'zip', V(R.isNotEmpty)); 
      billingInfo.country = getField($form, 'country',
          V(function(v) {return v != '-';}, 'emptyField')); 
    }




    // == SERVER ERROR UI METHODS
    var $serverErrors = $form.find('.server_errors');

    function clearServerErrors() {  
      $serverErrors.removeClass('any').addClass('none');
      $serverErrors.empty();
    }

    function displayServerErrors(errors) {
      clearServerErrors();
      console.log(errors);

      errors.forEach(function(e) {
        $serverErrors.removeClass('none').addClass('any');
        var $e = $('<div class="error">');
        $e.text(e);
        $serverErrors.append($e);
      });
    }

    // SUBMIT HANDLER
    $form.submit(function(e) {
      e.preventDefault(); 

      clearServerErrors();

      $form.find('.error').remove();
      $form.find('.invalid').removeClass('invalid');

      function complete() {
        $form.removeClass('submitting');
        $form.find('button.submit').removeAttr('disabled').text('Subscribe');
      }

      handleUserErrors(function() {
        syncUserInput();

        $form.addClass('submitting');
        $form.find('button.submit').attr('disabled', true).text('Please Wait');

        subscription.save(
          function(response) {
            if(options.afterSubscribe)
              options.afterSubscribe(response);

            if(options.successURL) {
              var url = options.successURL;
              url = url.replace(/\{account_code\}/g, subscription.account.code);
              window.location = url;
            }

            complete();

          }
        , function(errors) {
            if(!options.onErrors || !options.onError(errors)) {
              displayServerErrors(errors);
            }

            complete();
        });
      });

    });


    // FINALLY - UPDATE INITIAL TOTALS AND INJECT INTO DOM
    updateTotals();
    $container.html($form);

    if(options.afterLoad) {
      options.afterLoad();
    }
  });

};



R.subscribeFormHTML = '<form class="recurly subscribe"><div class="subscription"><div class="plan"><div class="name"></div><div class="field quantity"><div class="placeholder">Qty</div><input type="text"/></div><div class="recurring_cost"><div class="cost"></div><div class="interval"></div></div><div class="free_trial"></div><div class="setup_fee"><div class="title">Setup Fee</div><div class="cost"></div></div></div><div class="add_ons none"></div><div class="coupon"><div class="coupon_code field"><div class="placeholder">Coupon Code</div><input type="text" class="coupon_code"/></div><div class="check"></div><div class="description"></div><div class="discount"></div></div><div class="vat"><div class="title">VAT</div><div class="cost"></div></div></div><div class="due_now"><div class="title">Order Total</div><div class="cost"></div></div><div class="server_errors none"></div><div class="contact_info"><div class="title">Contact Info</div><div class="field first_name"><div class="placeholder">First Name </div><input type="text"/></div><div class="field last_name"><div class="placeholder">Last Name </div><input type="text"/></div><div class="field email"><div class="placeholder">Email </div><input type="text"/></div></div><div class="billing_info"></div><div class="footer"><button class="submit">Subscribe</button></div></form>';

R.accountUpdateFormHTML = '<form class="recurly account_update"><div class="contact_info"><div class="title">Contact Info</div><div class="field first_name"><div class="placeholder">First Name </div><input type="text"/></div><div class="field last_name"><div class="placeholder">Last Name </div><input type="text"/></div><div class="field email"><div class="placeholder">Email </div><input type="text"/></div></div><div class="billing_info"></div><div class="footer"><button class="submit">Update</button></div></form>';

R.billingInfoFieldsHTML = '<div class="title">Billing Info</div><div class="accepted_cards"><div class="card american_express">American Express</div><div class="card discover">Discover</div><div class="card mastercard">MasterCard </div><div class="card visa">Visa</div></div><div class="credit_card"><div class="field card_number"><div class="placeholder">Credit Card Number  </div><input type="text"/></div><div class="field cvv"><div class="placeholder">CVV </div><input type="text"/></div><div class="field expires"><div class="title">Expires </div><div class="month"><select><option value="1">01 - January</option><option value="2">02 - February</option><option value="3">03 - March</option><option value="4">04 - April</option><option value="5">05 - May</option><option value="6">06 - June</option><option value="7">07 - July</option><option value="8">08 - August</option><option value="9">09 - September</option><option value="10">10 - October</option><option value="11">11 - November</option><option value="12">12 - December</option><!-- = render :partial => \'months\' --></select></div><div class="year"><select></select></div></div></div><div class="address"><div class="field address1"><div class="placeholder">Address</div><input type="text"/></div><div class="field address2"><div class="placeholder">Apt/Suite</div><input type="text"/></div><div class="field city"><div class="placeholder">City</div><input type="text"/></div><div class="field state"><div class="placeholder">State</div><input type="text"/></div><div class="field zip"><div class="placeholder">Zip/Postal</div><input type="text"/></div><div class="field country"><!-- label Country --><select><option value="-">Select Country</option><option value="-">-------------- </option><option value="AF">Afghanistan</option><option value="AL">Albania</option><option value="DZ">Algeria</option><option value="AS">American Samoa</option><option value="AD">Andorra</option><option value="AO">Angola</option><option value="AI">Anguilla</option><option value="AQ">Antarctica</option><option value="AG">Antigua and Barbuda</option><option value="AR">Argentina</option><option value="AM">Armenia</option><option value="AW">Aruba</option><option value="AC">Ascension(Island</option><option value="AU">Australia</option><option value="AT">Austria</option><option value="AZ">Azerbaijan</option><option value="BS">Bahamas</option><option value="BH">Bahrain</option><option value="BD">Bangladesh</option><option value="BB">Barbados</option><option value="BY">Belarus</option><option value="BE">Belgium</option><option value="BZ">Belize</option><option value="BJ">Benin</option><option value="BM">Bermuda</option><option value="BT">Bhutan</option><option value="BO">Bolivia</option><option value="BA">Bosnia and Herzegovina</option><option value="BW">Botswana</option><option value="BV">Bouvet Island</option><option value="BR">Brazil</option><option value="BQ">British Antarctic Territory</option><option value="IO">British Indian Ocean Territory</option><option value="VG">British Virgin Islands</option><option value="BN">Brunei</option><option value="BG">Bulgaria</option><option value="BF">Burkina Faso</option><option value="BI">Burundi</option><option value="KH">Cambodia</option><option value="CM">Cameroon</option><option value="CA">Canada</option><option value="IC">Canary Islands</option><option value="CT">Canton and Enderbury Islands</option><option value="CV">Cape Verde</option><option value="KY">Cayman Islands</option><option value="CF">Central African Republic</option><option value="EA">Ceuta and Melilla</option><option value="TD">Chad</option><option value="CL">Chile</option><option value="CN">China</option><option value="CX">Christmas Island</option><option value="CP">Clipperton Island</option><option value="CC">Cocos [Keeling] Islands</option><option value="CO">Colombia</option><option value="KM">Comoros</option><option value="CD">Congo [DRC]</option><option value="CG">Congo [Republic]</option><option value="CK">Cook Islands</option><option value="CR">Costa Rica</option><option value="HR">Croatia</option><option value="CU">Cuba</option><option value="CY">Cyprus</option><option value="CZ">Czech Republic</option><option value="DK">Denmark</option><option value="DG">Diego Garcia</option><option value="DJ">Djibouti</option><option value="DM">Dominica</option><option value="DO">Dominican Republic</option><option value="NQ">Dronning Maud Land</option><option value="DD">East Germany</option><option value="TL">East Timor</option><option value="EC">Ecuador</option><option value="EG">Egypt</option><option value="SV">El Salvador</option><option value="GQ">Equatorial Guinea</option><option value="ER">Eritrea</option><option value="EE">Estonia</option><option value="ET">Ethiopia</option><option value="EU">European Union</option><option value="FK">Falkland Islands [Islas Malvinas]</option><option value="FO">Faroe Islands</option><option value="FJ">Fiji</option><option value="FI">Finland</option><option value="FR">France</option><option value="GF">French Guiana</option><option value="PF">French Polynesia</option><option value="TF">French Southern Territories</option><option value="FQ">French Southern and Antarctic Territories</option><option value="GA">Gabon</option><option value="GM">Gambia</option><option value="GE">Georgia</option><option value="DE">Germany</option><option value="GH">Ghana</option><option value="GI">Gibraltar</option><option value="GR">Greece</option><option value="GL">Greenland</option><option value="GD">Grenada</option><option value="GP">Guadeloupe</option><option value="GU">Guam</option><option value="GT">Guatemala</option><option value="GG">Guernsey</option><option value="GN">Guinea</option><option value="GW">Guinea-Bissau</option><option value="GY">Guyana</option><option value="HT">Haiti</option><option value="HM">Heard Island and McDonald Islands</option><option value="HN">Honduras</option><option value="HK">Hong Kong</option><option value="HU">Hungary</option><option value="IS">Iceland</option><option value="IN">India</option><option value="ID">Indonesia</option><option value="IR">Iran</option><option value="IQ">Iraq</option><option value="IE">Ireland</option><option value="IM">Isle of Man</option><option value="IL">Israel</option><option value="IT">Italy</option><option value="CI">Ivory Coast</option><option value="JM">Jamaica</option><option value="JP">Japan</option><option value="JE">Jersey</option><option value="JT">Johnston Island</option><option value="JO">Jordan</option><option value="KZ">Kazakhstan</option><option value="KE">Kenya</option><option value="KI">Kiribati</option><option value="KW">Kuwait</option><option value="KG">Kyrgyzstan</option><option value="LA">Laos</option><option value="LV">Latvia</option><option value="LB">Lebanon</option><option value="LS">Lesotho</option><option value="LR">Liberia</option><option value="LY">Libya</option><option value="LI">Liechtenstein</option><option value="LT">Lithuania</option><option value="LU">Luxembourg</option><option value="MO">Macau</option><option value="MK">Macedonia [FYROM]</option><option value="MG">Madagascar</option><option value="MW">Malawi</option><option value="MY">Malaysia</option><option value="MV">Maldives</option><option value="ML">Mali</option><option value="MT">Malta</option><option value="MH">Marshall Islands</option><option value="MQ">Martinique</option><option value="MR">Mauritania</option><option value="MU">Mauritius</option><option value="YT">Mayotte</option><option value="FX">Metropolitan France</option><option value="MX">Mexico</option><option value="FM">Micronesia</option><option value="MI">Midway Islands</option><option value="MD">Moldova</option><option value="MC">Monaco</option><option value="MN">Mongolia</option><option value="ME">Montenegro</option><option value="MS">Montserrat</option><option value="MA">Morocco</option><option value="MZ">Mozambique</option><option value="MM">Myanmar [Burma]</option><option value="NA">Namibia</option><option value="NR">Nauru</option><option value="NP">Nepal</option><option value="NL">Netherlands</option><option value="AN">Netherlands Antilles</option><option value="NT">Neutral Zone</option><option value="NC">New Caledonia</option><option value="NZ">New Zealand</option><option value="NI">Nicaragua</option><option value="NE">Niger</option><option value="NG">Nigeria</option><option value="NU">Niue</option><option value="NF">Norfolk Island</option><option value="KP">North Korea</option><option value="VD">North Vietnam</option><option value="MP">Northern Mariana Islands</option><option value="NO">Norway</option><option value="OM">Oman</option><option value="QO">Outlying Oceania</option><option value="PC">Pacific Islands Trust Territory</option><option value="PK">Pakistan</option><option value="PW">Palau</option><option value="PS">Palestinian Territories</option><option value="PA">Panama</option><option value="PZ">Panama Canal Zone</option><option value="PG">Papua New Guinea</option><option value="PY">Paraguay</option><option value="YD">People\'s Democratic Republic of Yemen</option><option value="PE">Peru</option><option value="PH">Philippines</option><option value="PN">Pitcairn Islands</option><option value="PL">Poland</option><option value="PT">Portugal</option><option value="PR">Puerto Rico</option><option value="QA">Qatar</option><option value="RO">Romania</option><option value="RU">Russia</option><option value="RW">Rwanda</option><option value="RE">R\u00e9union</option><option value="BL">Saint Barth\u00e9lemy</option><option value="SH">Saint Helena</option><option value="KN">Saint Kitts and Nevis</option><option value="LC">Saint Lucia</option><option value="MF">Saint Martin</option><option value="PM">Saint Pierre and Miquelon</option><option value="VC">Saint Vincent and the Grenadines</option><option value="WS">Samoa</option><option value="SM">San Marino</option><option value="SA">Saudi Arabia</option><option value="SN">Senegal</option><option value="RS">Serbia</option><option value="CS">Serbia and Montenegro</option><option value="SC">Seychelles</option><option value="SL">Sierra Leone</option><option value="SG">Singapore</option><option value="SK">Slovakia</option><option value="SI">Slovenia</option><option value="SB">Solomon Islands</option><option value="SO">Somalia</option><option value="ZA">South Africa</option><option value="GS">South Georgia and the South Sandwich Islands</option><option value="KR">South Korea</option><option value="ES">Spain</option><option value="LK">Sri Lanka</option><option value="SD">Sudan</option><option value="SR">Suriname</option><option value="SJ">Svalbard and Jan Mayen</option><option value="SZ">Swaziland</option><option value="SE">Sweden</option><option value="CH">Switzerland</option><option value="SY">Syria</option><option value="ST">S\u00e3o Tom\u00e9 and Pr\u00edncipe</option><option value="TW">Taiwan</option><option value="TJ">Tajikistan</option><option value="TZ">Tanzania</option><option value="TH">Thailand</option><option value="TG">Togo</option><option value="TK">Tokelau</option><option value="TO">Tonga</option><option value="TT">Trinidad and Tobago</option><option value="TA">Tristan da Cunha</option><option value="TN">Tunisia</option><option value="TR">Turkey</option><option value="TM">Turkmenistan</option><option value="TC">Turks and Caicos Islands</option><option value="TV">Tuvalu</option><option value="UM">U.S. Minor Outlying Islands</option><option value="PU">U.S. Miscellaneous Pacific Islands</option><option value="VI">U.S. Virgin Islands</option><option value="UG">Uganda</option><option value="UA">Ukraine</option><option value="SU">Union(of Soviet Socialist Republics</option><option value="AE">United Arab Emirates</option><option value="GB">United Kingdom</option><option value="US">United States</option><option value="UY">Uruguay</option><option value="UZ">Uzbekistan</option><option value="VU">Vanuatu</option><option value="VA">Vatican City</option><option value="VE">Venezuela</option><option value="VN">Vietnam</option><option value="WK">Wake Island</option><option value="WF">Wallis and Futuna</option><option value="EH">Western Sahara</option><option value="YE">Yemen</option><option value="ZM">Zambia</option><option value="ZW">Zimbabwe</option><option value="AX">\u00c5land Islands</option></select></div></div><div class="field vat_number"><div class="placeholder">VAT Number</div><input type="text"/></div>';

window.Recurly = R;

}(jQuery));

