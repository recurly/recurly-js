
/**
 * postal code to match for US sales tax
 */

var USST_POSTAL_CODE = '94110';


/**
 * country code to match for VAT
 */

var VAT_COUNTRY = 'DE';

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
  if (req.query.country === VAT_COUNTRY) return vat;
  return none;
};

var usst = [{
  type: 'us',
  rate: '0.0875'
}];

var vat = [{
  type: 'vat',
  rate: '0.015'
}];

var none = [];
