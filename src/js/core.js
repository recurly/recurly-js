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

R.version = '{VERSION}';

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


