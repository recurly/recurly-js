import isEmpty from 'lodash.isempty';
import { normalize } from '../../../util/normalize';
import { ADDRESS_FIELDS, NON_ADDRESS_FIELDS } from '../../token';

const BILLING_CONTACT_MAP = {
  first_name: 'givenName',
  last_name: 'familyName',
  address1: { field: 'addressLines', index: 0 },
  address2: { field: 'addressLines', index: 1 },
  city: 'locality',
  state: 'administrativeArea',
  postal_code: 'postalCode',
  country: 'countryCode',
};

const SHIPPING_CONTACT_MAP = {
  email: 'emailAddress',
  phone: 'phoneNumber',
};

const CONTACT_MAP = {
  ...BILLING_CONTACT_MAP,
  ...SHIPPING_CONTACT_MAP,
};

/**
 * Transforms a source address type to another address type.
 * @param {Object} source either an Address or ApplePayPaymentContact
 * @param {Object} options transform options
 * @param {string} options.to either 'contact' or 'address'
 * @param {string} options.except properties to exclude
 * @return {Object} the transform result
 */
export function transformAddress (source, { to = 'contact', except = [], map = CONTACT_MAP }) {
  if (isEmpty(source)) return {};

  return Object.keys(map).reduce((target, addressField) => {
    const contactField = map[addressField];
    const sourceField = to === 'contact' ? addressField : contactField;
    const targetField = to === 'address' ? addressField : contactField;

    if (~except.indexOf(sourceField)) return target;

    const sourceValue = typeof sourceField === 'object'
      ? source[sourceField.field]?.[sourceField.index]
      : source[sourceField];
    if (!sourceValue) return target;

    if (typeof targetField === 'object') {
      const { field, index } = targetField;
      target[field] = target[field] || [];
      target[field][index] = sourceValue;
    } else {
      target[targetField] = sourceValue;
    }

    return target;
  }, {});
}

export function normalizeForm (form) {
  if (!form) return {};

  const address = normalize(form, ADDRESS_FIELDS, { parseCard: false }).values;
  const billingContact = transformAddress(address, { map: BILLING_CONTACT_MAP });
  const shippingContact = transformAddress(address, { map: SHIPPING_CONTACT_MAP });
  const tokenData = normalize(form, NON_ADDRESS_FIELDS, { parseCard: false }).values;

  return {
    billingContact,
    shippingContact,
    tokenData,
  };
}
