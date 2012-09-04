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
