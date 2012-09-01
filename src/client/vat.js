var euCountries = ["AT","BE","BG","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","GB"];

var VAT = {
  isCountryInEU: function(country) {
    return $.inArray(country, euCountries) !== -1;
  }

, isNumberApplicable: function(buyerCountry, sellerCountry) {
    if(!R.settings.VATPercent) return false;

    if(!R.settings.country) {
      R.raiseError('you must configure a country for VAT to work');
    }

    if(!VAT.isCountryInEU(R.settings.country)) {
      R.raiseError('you cannot charge VAT outside of the EU');
    }

    // Outside of EU don't even show the number
    if(!VAT.isCountryInEU(buyerCountry)) {
      return false;
    }

    return true;
  }

, isChargeApplicable: function(buyerCountry, vatNumber) {
    // We made it so the VAT Number is collectable in any case
    // where it could be charged, so this is logically sound:
    if(!VAT.isNumberApplicable(buyerCountry)) return false;

    var sellerCountry = R.settings.country;

    // 1) Outside EU never pays
    // 2) Same country in EU always pays
    // 3) Different countries in EU, pay only without vatNumber
    return (sellerCountry == buyerCountry || !vatNumber);
  }
};

R.VAT = VAT;
