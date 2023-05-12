
/**
 * postal code to match for US sales tax
 */

const USST_POSTAL_CODE = '94110';

/**
 * postal code to match for US sales tax
 * with region data returned
 */

const USST_POSTAL_CODE_WITH_REGION = '94129';

/**
 * tax code to match for code exception example
 */

const USST_TAX_CODE = 'valid-tax-code';

/**
 * country code to match for VAT
 */

const VAT_COUNTRY = 'DE';

/**
 * country code to match for VAT 2015
 */

const VAT_2015_COUNTRY = 'GB';

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

module.exports = function tax () {
  if (this.query.country === 'US' && this.query.postal_code === USST_POSTAL_CODE && this.query.tax_code === USST_TAX_CODE) return usstWithTaxCode;
  if (this.query.country === 'US' && this.query.postal_code === USST_POSTAL_CODE) return usst;
  if (this.query.country === 'US' && this.query.postal_code === USST_POSTAL_CODE_WITH_REGION) return usstWithRegion;
  if (this.query.country === VAT_COUNTRY) return vat;
  if (this.query.country === VAT_2015_COUNTRY) return vat2015;
  return none;
};

const usst = [{
  type: 'us',
  rate: '0.0875'
}];

const usstWithRegion = [{
  type: 'us',
  rate: '0.0875',
  region: 'CA'
}];

const usstWithTaxCode = [{
  type: 'us',
  rate: '0.02'
}]

const vat = [{
  type: 'vat',
  rate: '0.015'
}];

const vat2015 = [{
  type: 'vat',
  rate: '0.2',
  region: 'GB'
}];

var none = [];
