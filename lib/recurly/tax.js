/**
 * Tax getter
 *
 * Provides a tax estimate for the given tax info.
 *
 * @param {Object} options
 * @param {Object} options.postal_code
 * @param {Object} options.country
 * @param {Object} [options.tax_code]
 * @param {Object} [options.vat_number] Used for VAT exemptions
 * @param {Function} callback
 */

export default function tax (options, done) {
  options = Object.assign({}, options);

  if (typeof done !== 'function') {
    throw new Error('Missing callback');
  }

  this.request.get({
    cached: true,
    route: '/tax',
    data: {
      country: options.country,
      postal_code: (options.postalCode || options.postal_code),
      tax_code: (options.taxCode || options.tax_code),
      vat_number: (options.vatNumber || options.vat_number)
    },
    done
  });
};
