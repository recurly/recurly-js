
/**
 * postal code to match for US sales tax
 */

var USST_POSTAL_CODE = '94110';

/**
 * postal code to match for US sales tax
 * with region data returned
 */

var USST_POSTAL_CODE_WITH_REGION = '94129';

/**
 * country code to match for VAT
 */

var VAT_COUNTRY = 'DE';

/**
 * country code to match for VAT 2015
 */

var VAT_2015_COUNTRY = 'GB';

/**
 * US sales tax response
 *   - country: 'US'
 *   - postal_code: USST_POSTAL_CODE
 *
 * VAT response
 *   - country: VAT_COUNTRY
 *
 * No tax response
 *   - all other requests
 */

module.exports = function tax (req, res) {
  if (req.query.country === 'US' && req.query.postal_code === USST_POSTAL_CODE) return usst;
  if (req.query.country === 'US' && req.query.postal_code === USST_POSTAL_CODE_WITH_REGION) return usst_with_region;
  if (req.query.country === VAT_COUNTRY) return vat;
  if (req.query.country === VAT_2015_COUNTRY) return vat_2015;
  return none;
};

var usst = [{
  type: 'us',
  rate: '0.0875'
}];

var usst_with_region = [{
  type: 'us',
  rate: '0.0875',
  region: 'CA'
}];

var vat = [{
  type: 'vat',
  rate: '0.015'
}];

var vat_2015 = [{
  type: 'vat',
  rate: '0.2',
  region: 'GB'
}];

var none = [];
