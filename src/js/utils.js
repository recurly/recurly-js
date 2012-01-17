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
, 'solo': {
    prefixes: [6334, 6767]
  , name: 'Solo'
  }
, 'switch': {
    prefixes: [4903, 4905, 4911, 4936, 564182, 633110, 6333, 6759]
  , name: 'Switch'
  }
, 'maestro': {
    prefixes: [5018, 5020, 5038, 6304, 6759, 6761]
  , name: 'Maestro'
  }
, 'visa_electron': {
    prefixes: [417500, 4917, 4913, 4508, 4844]
  , name: 'Visa Electron'
  } // visa electron
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
};


R.replaceVars = function(str, vars) {
  for(var k in vars) {
    if(vars.hasOwnProperty(k)) {
      var v = encodeURIComponent(vars[k]);
      str = str.replace(new RegExp('\\{'+k+'\\}', 'g'), v);
    }
  }

  return str;
};

R.post = function(url, params, options) {

  var resultNamespace = options.resultNamespace || 'recurly_result';

  var newParams = {};
  newParams[resultNamespace] = params;
  params = newParams;

  var form = $('<form />').hide();
  form.attr('action', url)
      .attr('method', 'POST')
      .attr('enctype', 'application/x-www-form-urlencoded');

  function addParam(name, value, parent) {
    var fullname = (parent.length > 0 ? (parent + '[' + name + ']') : name);
    if(typeof value === 'object') {
      for(var i in value) {
        if(value.hasOwnProperty(i)) {
          addParam(i, value[i], fullname);
        }
      }
    }
    else $('<input type="hidden" />').attr({name: fullname, value: value}).appendTo(form);
  };

  addParam('', params, '');

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
  options.data = $.extend({js_version: 2.0}, options.data);
  return $.ajax(options);
};


function errorDialog(message) {
  $('body').append(R.dom.error_dialog);
}

// R.extractEnforcedKey
